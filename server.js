const express = require("express");
const { NFC } = require("nfc-pcsc");
const axios = require("axios"); // For making HTTP requests
const moment = require("moment"); // For formatting date and time

const app = express();
const port = 5000;

// Middleware to parse JSON
app.use(express.json());

// Store attendance records locally (optional)
let attendance = [];

// Initialize NFC reader
const nfc = new NFC();

nfc.on("reader", (reader) => {
  console.log(`NFC reader connected: ${reader.reader.name}`);

  reader.on("card", async (card) => {
    const cardId = card.uid; // Extract the card ID
    const timestamp = moment().format("YYYY-MM-DD HH:mm"); // Get current date and time in required format
    let record = { cardId, timestamp, type: "" }; // Create a record

    // Find the last record for this card ID
    const lastRecord = attendance
      .filter((record) => record.cardId === cardId)
      .pop();

    // Determine if it's an "IN" or "OUT" scan
    if (!lastRecord || lastRecord.type === "OUT") {
      record.type = "IN"; // Mark as IN if no previous record or last record is OUT
    } else if (lastRecord.type === "IN") {
      record.type = "OUT"; // Mark as OUT if last record is IN
    } else {
      console.log("Invalid attendance state for card:", cardId);
      return;
    }

    // Add the record to the local attendance list (optional)
    attendance.push(record);
    console.log("Attendance Record:", record);

    // Prepare the payload for the external API
    const payload = {
      uid: cardId, // Updated field name
      datetime: timestamp, // Updated field name with correct format
      in_time: record.type === "IN" ? timestamp : null, // Set in_time for IN records
      out_time: record.type === "OUT" ? timestamp : null, // Set out_time for OUT records
      status: "On Time", // Default status (can be updated based on business logic)
      working_hours: "0.00", // Default working hours
      overtime_hours: "0.00", // Default overtime hours
    };

    // Send the record to the external API
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

// API to get attendance records from the external API
app.get("/attendances", async (req, res) => {
  try {
    const response = await axios.get("https://vovoureducation.com/api/attendances");
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching attendance data:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});