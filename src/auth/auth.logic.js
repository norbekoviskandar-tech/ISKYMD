// auth.logic.js - Now uses API instead of IndexedDB

export async function registerUser(name, email, password, role = "student") {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }

    return await res.json();
  } catch (error) {
    console.error('registerUser error:', error);
    throw error.message || error;
  }
}

export async function loginUser(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }

    const user = await res.json();

    // Clear any existing test data from previous users
    localStorage.removeItem("medbank_current_test");
    localStorage.removeItem("medbank_last_test_id");

    localStorage.setItem("medbank_user", user.id);
    return user;
  } catch (error) {
    console.error('loginUser error:', error);
    throw error.message || error;
  }
}

export async function changeUserPassword(userId, oldPassword, newPassword) {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: oldPassword, newPassword })
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to change password');
    }

    return true;
  } catch (error) {
    console.error('changeUserPassword error:', error);
    throw error.message || error;
  }
}

export function logout() {
  localStorage.removeItem("medbank_user");
  localStorage.removeItem("medbank_current_test");
  localStorage.removeItem("medbank_last_test_id");
}
