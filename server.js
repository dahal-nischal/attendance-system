const express = require("express");
const { NFC } = require("nfc-pcsc");
const axios = require("axios");
const moment = require("moment");
const cors = require("cors");  // Import cors

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const nfc = new NFC();
let newCardId = "none";
const TIMEOUT_DURATION = 10000;
let cardDetected = false;

nfc.on("reader", (reader) => {
  console.log(`NFC reader connected: ${reader.reader.name}`);

  reader.on("card", async (card) => {
    const cardId = card.uid;
    newCardId = cardId;
    cardDetected = true;

    const timestamp = moment().format("YYYY-MM-DD HH:mm");

    const payload = {
      uid: cardId,
      datetime: timestamp,
    };

    try {
      const response = await axios.post(
        "https://vovoureducation.com/api/attendance/record",
        payload
      );
      console.log("API Response:", response.data);
    } catch (error) {
      console.error("Error sending data to API:", error.response?.data || error.message);
    }
  });

  reader.on("error", (err) => {
    console.error("NFC reader error:", err);
  });

  reader.on("end", () => {
    console.log("NFC reader disconnected.");
  });
});

const registerUser = async (req, res) => {
  const { user_id, name, email, email_verified_at, working_shift } = req.body;

  // Don't redefine these variables, keep the global scope values
  const timeout = setTimeout(() => {
    if (!cardDetected) {
      if (!res.headersSent) {
        return res.status(400).json({ message: "No card detected within the timeout period" });
      }
    }
  }, TIMEOUT_DURATION);

  const waitForCard = new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (cardDetected) {
        clearInterval(interval);
        resolve();
      }
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error("No card detected within the timeout period"));
    }, TIMEOUT_DURATION);
  });

  try {
    await waitForCard;

    // Use global newCardId and cardDetected to process user registration
    const user = {
      name,
      email,
      email_verified_at,
      working_shift,
      uid: String(newCardId),
    };

    try {
      const response = await axios.put(
        `https://vovoureducation.com/api/users/${user_id}`,
        user
      );
      console.log("API Response:", response.data);
    } catch (error) {
      console.error("Error sending data to API:", error.response?.data || error.message);
    }

    if (!res.headersSent) {
      res.status(200).json({
        message: "User registered successfully",
        cardId: newCardId,
        userDetails: user,
      });
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(400).json({ message: error.message });
    }
  } finally {
    cardDetected = false;
    newCardId = "none";
  }
};

app.post("/registerUser", registerUser);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
