const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { generateKeyPairSync, sign } = require("crypto");
const logger = require("morgan");

const apiRoutes = require("./apiRoutes");
const quotesRouter = require("./quotes");

const admin = require("firebase-admin");
const firestore = admin.firestore();

const app = express();
const PORT = 3003;

app.use(cors());
app.use(logger("dev"));

app.use(express.json());

app.listen(PORT, () => {
  console.log(`API listening on PORT ${PORT} `);
});

app.get("/", (_, res) => {
  res.send(">> F1 Ticket Manager Express backend is running...");
});

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.slice(7);

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.uid !== req.body.userId) {
      return res.status(401).json({ error: "Invalid token for this user" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/order", verifyFirebaseToken, (req, res, _) => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });

  try {
    const data = req.body.data;
    const sha256Hash = crypto.createHash("sha256");
    sha256Hash.update(JSON.stringify(data));
    const orderHash = sha256Hash.digest();

    const signature = sign("sha256", Buffer.from(orderHash), privateKey);

    data.forEach(async (item) => {
      const uidPin = item.uid + req?.body?.pin;

      const hash = crypto.createHash("sha256");
      hash.update(JSON.stringify(uidPin));
      const itemHash = hash.digest().toString("base64");

      const { circuitId, type, quantity, uid } = item;
      const date = new Date();

      const ordersRef = firestore
        .collection("orders")
        .doc(circuitId)
        .collection("orders");

      try {
        await ordersRef.add({
          uid,
          type,
          quantity,
          date,
          itemHash,
        });
      } catch (error) {
        console.error("Error adding order: ", error);
      }
    });

    res.json({
      publicKey: publicKey,
      digitalSignature: signature.toString("base64"),
    });
  } catch (error) {
    console.error("Error while signing:", error.message);
    res.status(5000).json({ error: true });
  }
});

app.post("/scan", verifyFirebaseToken, async (req, res, _) => {
  try {
    const { uid, pin, circuitId } = req.body;

    const ordersRef = firestore
      .collection("orders")
      .doc(circuitId)
      .collection("orders");

    const snapshot = await ordersRef.get();
    let valid = false;
    snapshot.forEach((doc) => {
      if (doc?.data()?.uid === uid) {
        const order = doc.data();

        const hash = crypto.createHash("sha256");
        hash.update(JSON.stringify(uid + pin));
        const actualHash = hash.digest().toString("base64");

        valid = actualHash === order?.itemHash;
      }
    });

    res.status(200).json({ isValid: valid });
  } catch (error) {
    console.error("Error while verifying:", error.message);
    res.status(400).json({ error: "Unexpted error!" });
  }
});

app.post("/verify", verifyFirebaseToken, (req, res, _) => {
  try {
    const data = req.body;
    const sha256Hash = crypto.createHash("sha256");
    sha256Hash.update(JSON.stringify(data?.originalData));
    const orderHash = sha256Hash.digest();

    const isVerified = crypto.verify(
      "sha256",
      orderHash,
      data?.publicKey,
      Buffer.from(data?.digitalSignature, "base64")
    );

    res.status(isVerified ? 200 : 400).json({ isVerified });
  } catch (error) {
    console.error("Error while verifying:", error.message);
    res.status(400).json({ isVerified: false });
  }
});

module.exports = app;
