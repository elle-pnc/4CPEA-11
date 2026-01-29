# How to Pre-populate Test Accounts

There are several ways to create test accounts in your Firebase project. Choose the method that works best for you.

## Method 1: Using Firebase Console (Easiest - No Code)

### Step 1: Create Users in Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cpe11-48f3f`
3. Click on **Authentication** in the left sidebar
4. Click on **Users** tab
5. Click **Add user** button
6. Enter:
   - **Email**: `test1@example.com`
   - **Password**: `Test1234!`
   - Check **Set email as verified**
7. Click **Add user**
8. Repeat for additional test accounts

### Step 2: Create Firestore Documents

1. Go to **Firestore Database** in Firebase Console
2. Click on **Start collection** (if it's empty) or go to `users` collection
3. For each user you created in Auth:

**Document ID**: Use the UID from the Authentication user (copy it from Auth tab)

**Fields** (add these one by one):
```
email: string → "test1@example.com"
firstName: string → "Juan"
lastName: string → "Dela Cruz"
cardNumber: string → "0000 0000 0000"
balance: number → 500.00
currentTerminal: number → 1
currentRoute: null (leave empty)
language: string → "English"
theme: string → "light"
createdAt: timestamp → (click and set to current time)
updatedAt: timestamp → (click and set to current time)
```

4. Click **Save**

### Sample Test Accounts

Create these accounts:

**Account 1:**
- Email: `test1@example.com`
- Password: `Test1234!`
- firstName: `Juan`
- lastName: `Dela Cruz`
- balance: `500.00`
- currentTerminal: `1`

**Account 2:**
- Email: `test2@example.com`
- Password: `Test1234!`
- firstName: `Maria`
- lastName: `Santos`
- balance: `250.00`
- currentTerminal: `2`

---

## Method 2: Using Firebase Admin SDK (Automated)

This requires setting up Firebase Admin SDK.

### Step 1: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### Step 2: Get Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Download the JSON file
4. Save it securely (add to `.gitignore`)

### Step 3: Create Seed Script

See `scripts/seedAccounts.js` for a complete example.

Run it with:
```bash
node scripts/seedAccounts.js
```

---

## Method 3: Using Browser Console (Quick Test)

This method uses your app's Firebase client SDK to create accounts directly.

### Option A: Using Sign Up Flow

1. Open your app
2. Go to the sign-up page (or create one)
3. Sign up with test accounts:
   - `test1@example.com` / `Test1234!`
   - `test2@example.com` / `Test1234!`

The accounts will be created in Auth automatically, and your `createOrGetUser` function will create the Firestore document.

### Option B: Browser Console Script

1. Open your app in browser
2. Open Developer Console (F12)
3. Paste this code:

```javascript
// Import Firebase (already available in your app)
const { createUserWithEmailAndPassword } = window.firebase?.auth || 
  (await import('/src/firebase/config.js')).auth;

// Create account helper
async function createTestAccount(email, password, userData) {
  const { createUserWithEmailAndPassword } = await import('/src/firebase/auth.js');
  const { doc, setDoc } = await import('firebase/firestore');
  const { db } = await import('/src/firebase/config.js');
  
  try {
    // This won't work with client SDK - you need Admin SDK for creating users
    // Instead, use the sign-up flow or Firebase Console
    console.log('Use Firebase Console or sign-up flow to create Auth users first');
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## Method 4: Add Sign-Up Page to Your App

The easiest way for testing is to add a sign-up page to your app.

### Create SignUpPage Component

Create `src/pages/SignUpPage.jsx`:

```javascript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp } from '../firebase/auth'
import { useTranslation } from '../contexts/TranslationContext'
import './LoginPage.css' // Reuse login styles

const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const t = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, { firstName, lastName })
      navigate('/verify')
    } catch (error) {
      console.error('Sign up error:', error)
      setError(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-container">
      <div className="login-page">
        <h1>Sign Up</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p onClick={() => navigate('/login')}>Already have an account? Login</p>
      </div>
    </div>
  )
}

export default SignUpPage
```

Then add the route in `App.jsx`:
```javascript
<Route path="/signup" element={<SignUpPage />} />
```

---

## Recommended Approach

For quick testing, I recommend:

1. **Method 1 (Firebase Console)** - Easiest, no code needed
2. **Method 4 (Sign-Up Page)** - Best for ongoing testing, users can create their own accounts
3. **Method 2 (Admin SDK)** - Best for automated testing or production seeding

---

## Quick Reference: Test Account Data

```
Email: test1@example.com
Password: Test1234!
UID: (copy from Firebase Console after creating)
```

Firestore Document:
```json
{
  "email": "test1@example.com",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "cardNumber": "0000 0000 0000",
  "balance": 500.00,
  "currentTerminal": 1,
  "currentRoute": null,
  "language": "English",
  "theme": "light",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## Troubleshooting

**Problem**: "User already exists"
- Solution: Use a different email or delete the existing user from Firebase Console

**Problem**: "Permission denied" when creating Firestore document
- Solution: Make sure Firestore security rules allow authenticated users to create documents

**Problem**: Auth user created but Firestore document missing
- Solution: Check that `createOrGetUser` function is being called correctly, or create the Firestore document manually
