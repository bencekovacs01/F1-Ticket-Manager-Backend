# F1 Ticket Manager Backend

This repository contains the backend code for the F1 Ticket Manager written in the Express framework of Node.js, an application that manages and verifies F1 ticket orders using cryptographic algorithms and Firebase authentication.

## Prerequisites

Before running the application, ensure you have the following dependencies installed:

- Node.js
- npm
- Firebase Admin SDK
- Express
- Cors
- Morgan

Install the dependencies by running:

```bash
npm install
```
or
```bash
yarn install
```

## Configuration
Set up a Firebase project and obtain the Firebase Admin SDK JSON file.
Replace the placeholder in the firebase-admin.json file with your Firebase Admin SDK credentials.

Usage
Run the application with the following command:

```bash
node app.js
```
or
```bash
yarn dev
```
The API will be accessible at http://localhost:3003.
