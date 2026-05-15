# 🩸 BloodLink (formerly BloodBridge)

### 🏆 Hacked 2026 Honourary Prize Winner

**BloodLink** is a next-generation real-time blood donation matching platform designed to bridge the critical gap between hospitals in urgent need and life-saving donors. By leveraging real-time geospatial technology and Progressive Web App (PWA) capabilities, BloodLink ensures that when every second counts, the right blood type finds its way to the right patient.

---

## 🌍 The Mission: Tech for Social Good

In critical medical emergencies, the delay in finding a compatible blood donor can be fatal. Traditional blood bank systems often rely on slow, manual communication. BloodLink transforms this process into an automated, high-speed matching engine.

**Our Impact Scope:**
*   **Zero-Latency Matching:** Instantly notify compatible donors within a specific radius of a hospital.
*   **Donor Retention:** Gamified experience with "Life Points" and verification history to encourage regular donations.
*   **Hospital Efficiency:** Automated donor check-in via secure alphanumeric codes, reducing administrative overhead during emergencies.
*   **Accessibility:** As a PWA, BloodLink works on any device (mobile/desktop) and supports offline-first capabilities for low-connectivity environments.

---

## ✨ Key Features

### For Donors 🙋‍♂️
*   **Real-time Alerts:** Receive push notifications the moment a hospital near you needs your specific blood type.
*   **Live Ticket Tracking:** See active requests in your city and accept them with one tap.
*   **Secure Check-in:** Generate unique verification codes to ensure your donation is tracked and credited.
*   **Profile Management:** Track your donation history, points, and cooldown period.

### For Hospitals 🏥
*   **Urgent Ticket Creation:** Launch a blood request in seconds, specifying blood type, units needed, and urgency level.
*   **Geospatial Broadcasting:** Automatically target donors within a specific KM radius.
*   **Real-time Dashboard:** Monitor donor responses as they happen with audible alerts ("pings").
*   **Seamless Verification:** Verify donations across all hospital tickets using a unified code search system.

---

## 🛠 Technology Stack

*   **Frontend:** React + TypeScript + Vite
*   **Styling:** Tailwind CSS + Shadcn UI (Premium Dark/Light modes)
*   **Backend:** Supabase (Database, Auth, Edge Functions)
*   **Real-time:** Supabase Realtime (Postgres Changes)
*   **Notifications:** Web Push API + VAPID (PWA Service Workers)
*   **Maps:** OpenStreetMap + Nominatim API

---

## 🚀 Getting Started

1.  **Clone & Install:**
    ```bash
    git clone https://github.com/your-repo/BloodBridge.git
    npm install
    ```

2.  **Environment Setup:** Create a `.env` file with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_url
    VITE_SUPABASE_ANON_KEY=your_key
    VITE_VAPID_PUBLIC_KEY=your_vapid_key
    ```

3.  **Run Locally:**
    ```bash
    npm run dev
    ```

4.  **Build PWA:**
    ```bash
    npm run build && npm run preview
    ```

---

## 🎖 Recognition

BloodLink was awarded the **Honourary Prize at Hacked 2026** for its innovative use of real-time web technologies and its potential to solve a high-impact global health challenge.

---

*“Bridging the gap between a hero and a heartbeat.”*
