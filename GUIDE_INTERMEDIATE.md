# 🛠️ SteganoWorld: Intermediate Developer Guide

This guide covers the system architecture, database design, and the general flow of the SteganoWorld platform.

## 1. System Architecture
SteganoWorld follows a **Client-Server relay model** with mandatory client-side encryption.

*   **Frontend**: Built with **Next.js & Tailwind**. It handles all encryption logic using the **Web Crypto API**.
*   **Backend**: A **Flask** server that manages user accounts, stores encrypted blobs, and relays messages in real-time using **Socket.IO**.
*   **Database**: **PostgreSQL** (via Supabase) stores user profiles and public keys.

## 2. Database Schema
### `chat_users` (Profiles)
Stores information about the users and their **Public Keys**.
*   `username`: Unique handle.
*   `public_key`: Used for signing (Auth).
*   `encryption_public_key`: Used for message encryption (RSA).

### `messages` (Transmission)
Stores encrypted messages until the recipient reads them.
*   `encrypted_message`: The actual message ciphertext.
*   `encrypted_aes_key_recipient`: The AES key locked for the receiver.
*   `encrypted_aes_key_sender`: The AES key locked for the sender.
*   `iv`: The unique "salt" used for this message.

## 3. The Encryption Workflow
1.  **Asymmetric Encryption (RSA)**: Used to share secrets between two people who haven't met.
2.  **Symmetric Encryption (AES)**: Used to quickly encrypt the large message body.
3.  **Process**:
    *   Sender gets Recipient's **Public RSA Key**.
    *   Sender creates a random **AES Key**.
    *   Sender encrypts message with **AES**.
    *   Sender encrypts the **AES Key** with the Recipient's **Public RSA Key**.
    *   Only the Recipient can open it using their **Private RSA Key**.

## 4. Technology Stack
*   **React / Next.js**: Modern UI and routing.
*   **Framer Motion**: Smooth animations and transitions.
*   **PostgreSQL / SQLAlchemy**: Robust data management.
*   **WebSockets**: For "instant" feel in the chat.

---
*For deep cryptographic details, see GUIDE_ADVANCED.md*
