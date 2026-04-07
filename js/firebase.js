// ============================================
// SHARELINK — FIREBASE INTEGRATION
// firebase.js — drop this in your js/ folder
// ============================================
// Works with plain HTML/CSS/JS — no npm needed
// Uses Firebase v9 compat SDK via CDN
// ============================================

// --------------------------------------------
// PASTE THIS IN THE <head> OF EVERY HTML PAGE
// (before your own <script> tags)
// --------------------------------------------
// <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
// <script src="js/firebase.js"></script>
// --------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDT_EdqZk6jYQpN11uNMNo_2op2y3Ki4FM",
  authDomain: "sharelink-backend2.firebaseapp.com",
  projectId: "sharelink-backend2",
  storageBucket: "sharelink-backend2.firebasestorage.app",
  messagingSenderId: "168358474539",
  appId: "1:168358474539:web:97358812783ee3764a8b6e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// AUTH — CURRENT USER HELPER
// ============================================
// Call this anywhere to get the logged-in user
// Returns null if not logged in
const getCurrentUser = () => auth.currentUser;

// Listen for auth state changes (call on every page load)
// Usage: onAuthReady(user => { if (!user) redirect to login })
const onAuthReady = (callback) => {
  auth.onAuthStateChanged(callback);
};

// Redirect to login if not authenticated
// Call this at the top of any page that needs login
const requireAuth = () => {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });
};

// Redirect to home if already logged in
// Call this on login/signup pages
const redirectIfLoggedIn = () => {
  auth.onAuthStateChanged(user => {
    if (user) {
      window.location.href = 'home.html';
    }
  });
};

// ============================================
// AUTH — SIGN UP
// ============================================
// Usage:
//   const result = await signUp('email', 'pass', { displayName, userType, phone, address });
//   if (result.success) { redirect to home }
//   else { show result.error }
const signUp = async (email, password, profileData = {}) => {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update display name in Firebase Auth
    if (profileData.displayName) {
      await user.updateProfile({ displayName: profileData.displayName });
    }

    // Create profile in Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: profileData.displayName || '',
      photoURL: '',
      userType: profileData.userType || 'donator', // 'donator' | 'recipient' | 'organization'
      location: profileData.location || null,
      address: profileData.address || '',
      phone: profileData.phone || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      rating: 0,
      itemsDonated: 0,
      itemsReceived: 0,
      isVerified: false
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: _friendlyError(error.code) };
  }
};

// ============================================
// AUTH — LOGIN
// ============================================
// Usage:
//   const result = await logIn('email', 'password');
//   if (result.success) { redirect to home }
//   else { show result.error }
const logIn = async (email, password) => {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: _friendlyError(error.code) };
  }
};

// ============================================
// AUTH — GOOGLE SIGN IN
// ============================================
// Usage:
//   const result = await signInWithGoogle();
//   if (result.success) { redirect to home }
const signInWithGoogle = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const userCredential = await auth.signInWithPopup(provider);
    const user = userCredential.user;

    // Check if profile already exists, create if not
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        userType: 'donator',
        location: null,
        address: '',
        phone: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        rating: 0,
        itemsDonated: 0,
        itemsReceived: 0,
        isVerified: false
      });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: _friendlyError(error.code) };
  }
};

// ============================================
// AUTH — LOGOUT
// ============================================
const logOut = async () => {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// ============================================
// AUTH — FORGOT PASSWORD
// ============================================
const resetPassword = async (email) => {
  try {
    await auth.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error) {
    return { success: false, error: _friendlyError(error.code) };
  }
};

// ============================================
// USERS — GET PROFILE
// ============================================
const getUserProfile = async (userId) => {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('getUserProfile error:', error);
    return null;
  }
};

// ============================================
// USERS — GET MY PROFILE
// ============================================
const getMyProfile = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  return getUserProfile(user.uid);
};

// ============================================
// USERS — UPDATE PROFILE
// ============================================
// Usage: await updateProfile({ address: 'Lagos', phone: '+234...' })
const updateUserProfile = async (updates) => {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  try {
    await db.collection('users').doc(user.uid).update(updates);

    // Also update displayName in Auth if provided
    if (updates.displayName) {
      await user.updateProfile({ displayName: updates.displayName });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// ITEMS — CREATE ITEM
// ============================================
// Usage:
//   const result = await createItem({
//     title: 'Winter coat',
//     description: 'Barely worn...',
//     category: 'clothes',    // clothes | books | furniture | electronics | other
//     condition: 'good',      // new | like-new | good | fair
//     address: 'Lagos Island',
//   });
const createItem = async (itemData) => {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  try {
    const profile = await getUserProfile(user.uid);

    const item = {
      title: itemData.title,
      description: itemData.description || '',
      category: itemData.category,
      condition: itemData.condition || 'good',
      imageUrls: itemData.imageUrls || [],
      ownerId: user.uid,
      ownerName: profile?.displayName || user.displayName || '',
      location: itemData.location || null,
      address: itemData.address || '',
      status: 'available',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ),
      views: 0
    };

    const docRef = await db.collection('items').add(item);

    // Increment user's donated count
    await db.collection('users').doc(user.uid).update({
      itemsDonated: firebase.firestore.FieldValue.increment(1)
    });

    return { success: true, itemId: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// ITEMS — GET ALL AVAILABLE ITEMS (for feed)
// ============================================
// Usage:
//   const items = await getAvailableItems();           // all items
//   const items = await getAvailableItems('clothes');  // filtered
const getAvailableItems = async (category = null, limitCount = 20) => {
  try {
    let query = db.collection('items')
      .where('status', '==', 'available')
      .orderBy('createdAt', 'desc')
      .limit(limitCount);

    const snapshot = await query.get();
    let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by category client-side (avoids Firestore composite index requirement)
    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }

    return items;
  } catch (error) {
    console.error('getAvailableItems error:', error);
    return [];
  }
};

// ============================================
// ITEMS — GET SINGLE ITEM
// ============================================
const getItem = async (itemId) => {
  try {
    const doc = await db.collection('items').doc(itemId).get();
    if (!doc.exists) return null;

    // Increment views
    db.collection('items').doc(itemId).update({
      views: firebase.firestore.FieldValue.increment(1)
    });

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('getItem error:', error);
    return null;
  }
};

// ============================================
// ITEMS — GET MY ITEMS (for profile page)
// ============================================
const getMyItems = async () => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const snapshot = await db.collection('items')
      .where('ownerId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getMyItems error:', error);
    return [];
  }
};

// ============================================
// ITEMS — DELETE ITEM
// ============================================
const deleteItem = async (itemId) => {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  try {
    const doc = await db.collection('items').doc(itemId).get();
    if (!doc.exists) return { success: false, error: 'Item not found' };
    if (doc.data().ownerId !== user.uid) return { success: false, error: 'Not your item' };

    await db.collection('items').doc(itemId).delete();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// REQUESTS — SEND REQUEST FOR AN ITEM
// ============================================
// Usage:
//   const result = await requestItem(itemId, 'I really need this because...');
const requestItem = async (itemId, message = '') => {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  try {
    const item = await getItem(itemId);
    if (!item) return { success: false, error: 'Item not found' };
    if (item.ownerId === user.uid) return { success: false, error: "You can't request your own item" };

    const profile = await getUserProfile(user.uid);

    const request = {
      itemId,
      itemTitle: item.title,
      requesterId: user.uid,
      requesterName: profile?.displayName || user.displayName || '',
      donorId: item.ownerId,
      status: 'pending',
      message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('requests').add(request);

    // Mark item as reserved
    await db.collection('items').doc(itemId).update({ status: 'reserved' });

    return { success: true, requestId: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// REQUESTS — GET RECEIVED REQUESTS (donor sees these)
// ============================================
const getReceivedRequests = async () => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const snapshot = await db.collection('requests')
      .where('donorId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getReceivedRequests error:', error);
    return [];
  }
};

// ============================================
// REQUESTS — GET SENT REQUESTS (requester sees these)
// ============================================
const getSentRequests = async () => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const snapshot = await db.collection('requests')
      .where('requesterId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getSentRequests error:', error);
    return [];
  }
};

// ============================================
// REQUESTS — ACCEPT OR REJECT
// ============================================
// Usage:
//   await respondToRequest(requestId, 'accepted');
//   await respondToRequest(requestId, 'rejected');
const respondToRequest = async (requestId, newStatus) => {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  try {
    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) return { success: false, error: 'Request not found' };

    const data = requestDoc.data();
    if (data.donorId !== user.uid) return { success: false, error: 'Not authorized' };

    await requestRef.update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // If accepted → create a match
    if (newStatus === 'accepted') {
      await db.collection('matches').add({
        itemId: data.itemId,
        donorId: data.donorId,
        recipientId: data.requesterId,
        pickupLocation: null,
        pickupAddress: '',
        scheduledDate: null,
        status: 'scheduled',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        completedAt: null
      });
    } else if (newStatus === 'rejected') {
      // Make item available again if rejected
      await db.collection('items').doc(data.itemId).update({ status: 'available' });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// SEARCH — SEARCH ITEMS BY TITLE
// ============================================
// Firestore doesn't have native text search, so we
// fetch recent items and filter client-side.
// Good enough for a demo — upgrade to Algolia later.
const searchItems = async (query, category = null) => {
  try {
    const items = await getAvailableItems(category, 100);
    const q = query.toLowerCase().trim();
    if (!q) return items;

    return items.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q)
    );
  } catch (error) {
    console.error('searchItems error:', error);
    return [];
  }
};

// ============================================
// UTILS — SAVE ITEM ID TO SESSION (for item detail page)
// ============================================
// Call on home page when user clicks an item card:
//   saveItemId(item.id);
//   window.location.href = 'item-detail.html';
// Then on item-detail.html:
//   const itemId = getSavedItemId();
//   const item = await getItem(itemId);
const saveItemId = (itemId) => {
  sessionStorage.setItem('currentItemId', itemId);
};

const getSavedItemId = () => {
  return sessionStorage.getItem('currentItemId');
};

// ============================================
// UTILS — FORMAT FIRESTORE TIMESTAMP
// ============================================
// Usage: formatDate(item.createdAt) → "3 days ago"
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ============================================
// UTILS — FRIENDLY ERROR MESSAGES
// ============================================
const _friendlyError = (code) => {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Connection failed. Check your internet.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
};

// ============================================
// EXPORT (for reference — all functions are global)
// ============================================
// Auth:        signUp, logIn, signInWithGoogle, logOut, resetPassword
// Auth guards: requireAuth, redirectIfLoggedIn, onAuthReady, getCurrentUser
// Users:       getUserProfile, getMyProfile, updateUserProfile
// Items:       createItem, getAvailableItems, getItem, getMyItems, deleteItem
// Requests:    requestItem, getReceivedRequests, getSentRequests, respondToRequest
// Search:      searchItems
// Utils:       saveItemId, getSavedItemId, formatDate
