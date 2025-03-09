import React, { useState, useEffect, useRef } from "react";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import axios from "axios";

const RegisterUser = () => {
  const [users, setUsers] = useState([]); // Users without a UID
  const [selectedUser, setSelectedUser] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [cardId, setCardId] = useState(null);
  const toast = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from the API
  const fetchUsers = async () => {
    try {
      const response = await axios.get("https://vovoureducation.com/api/users");
      console.log("API Response:", response.data.data); // Debugging

      if (Array.isArray(response.data.data)) {
        // Filter out users without a UID
        const unregisteredUsers = response.data.data.filter(user => !user.uid || user.uid === "");
        setUsers(unregisteredUsers); // Ensure state updates correctly
        console.log("Filtered Users:", unregisteredUsers);
      } else {
        console.error("Unexpected API response structure", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Register the user and assign a card
  const registerCard = async () => {
    if (!selectedUser) {
      toast.current.show({ severity: "warn", summary: "Warning", detail: "Please select a user." });
      return;
    }

    setIsWaiting(true);
    setCardId(null);

    try {
      // Send the user registration request with full user object
      const response = await axios.post("http://localhost:5000/registerUser", {
        user_id: selectedUser.user_id, // Send the user_id
        name: selectedUser.name,
        email: selectedUser.email,
        email_verified_at: selectedUser.email_verified_at,
        working_shift: selectedUser.working_shift,
      });

      const newCardId = response.data.cardId;
      setCardId(newCardId);

      // Show success message
      toast.current.show({ severity: "success", summary: "Success", detail: "Card registered successfully." });

      // Remove the registered user from the list
      setUsers(prevUsers => prevUsers.filter(user => user.user_id !== selectedUser.user_id));

      setSelectedUser(null); // Reset the selection after registration
    } catch (error) {
      // Show error message
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error.response?.data.message || "Failed to register card.",
      });
    } finally {
      setIsWaiting(false); // Reset the waiting state
    }
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <h2>Register User with NFC Card</h2>
      <div className="p-field">
        <label>Select User</label>
        {/* Dropdown for selecting user */}
        <Dropdown
          value={selectedUser}
          options={users} // Pass the full user object
          onChange={(e) => setSelectedUser(e.value)} // Set the full user object
          optionLabel="name" // Use the name to display in the dropdown
          placeholder="Select a user"
          className="w-full md:w-20rem"
        />
      </div>

      {/* Register button */}
      <Button
        label={isWaiting ? "Waiting for Card..." : "Register Card"}
        onClick={registerCard}
        disabled={isWaiting} // Disable button while waiting
        className="mt-3"
      />

      {/* Display card ID once registered */}
      {cardId && <p className="mt-3">Assigned Card ID: {cardId}</p>}
    </div>
  );
};

export default RegisterUser;
