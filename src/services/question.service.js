// question.service.js - Now uses API instead of IndexedDB

const API_BASE = '/api/questions';

// Optional productId parameter for product-specific question pools
export async function getAllQuestions(productId = null) {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  const isAuthor = typeof window !== 'undefined' && localStorage.getItem("medbank-author-unlocked") === "true";
  const isAuthorRoute = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/author');

  try {
    if ((isAuthor && isAuthorRoute) || !userId) {
      // Authors get questions, potentially filtered by packageId
      let effectiveProductId = productId;
      if (effectiveProductId === null && typeof window !== 'undefined') {
        const storedContext = localStorage.getItem("medbank_author_product_context");
        if (storedContext) {
          try {
            const product = JSON.parse(storedContext);
            effectiveProductId = product?.id || null;
          } catch (e) {
            effectiveProductId = null;
          }
        }
      }

      let url = API_BASE;
      url += `?includeUnpublished=true`; // Authors always see everything
      if (effectiveProductId) {
        url += `&productId=${effectiveProductId}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch questions');
      return await res.json();
    }

    // Students get published questions with their progress, filtered by productId
    let effectiveProductId = productId;
    if (effectiveProductId === null && typeof window !== 'undefined') {
      const storedProduct = localStorage.getItem("medbank_focused_product");
      if (storedProduct) {
        try {
          const product = JSON.parse(storedProduct);
          effectiveProductId = product?.id || null;
        } catch (e) {
          effectiveProductId = null;
        }
      }
    }

    let url = `${API_BASE}/user?userId=${userId}&includeUnpublished=false`;
    if (effectiveProductId) {
      url += `&productId=${effectiveProductId}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch questions');
    return await res.json();
  } catch (error) {
    console.error('getAllQuestions error:', error);
    return [];
  }
}

export async function getQuestionById(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch question');
    }
    return await res.json();
  } catch (error) {
    console.error('getQuestionById error:', error);
    return null;
  }
}

export async function addQuestion(question) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    if (!res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        throw new Error(`${res.status}: ${data.error || 'Failed to add question'}`);
      } catch (e) {
        throw new Error(`${res.status}: ${text}`);
      }
    }
    return await res.json();
  } catch (error) {
    console.error('addQuestion error:', error);
    throw error;
  }
}

export async function updateQuestion(updatedQuestion) {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  const isAuthor = typeof window !== 'undefined' && localStorage.getItem("medbank-author-unlocked") === "true";
  const isAuthorRoute = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/author');

  try {
    if (isAuthor && isAuthorRoute) {
      // Author updates the master question
      const res = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuestion)
      });
      if (!res.ok) {
        const text = await res.text();
        let errMessage = 'Failed to update question';
        try {
          const parsed = text ? JSON.parse(text) : null;
          if (parsed?.error) errMessage = parsed.error;
        } catch (_) {
          if (text) errMessage = text;
        }
        throw new Error(errMessage);
      }
      return await res.json();
    }

    // Student updates their progress only
    if (userId) {
      const payload = {
        userId,
        questionId: updatedQuestion.id,
        productId: updatedQuestion.productId || updatedQuestion.packageId,
        packageId: updatedQuestion.packageId || updatedQuestion.productId,
        status: updatedQuestion.status,
        isMarked: updatedQuestion.isMarked,
        userAnswer: updatedQuestion.userAnswer,
        userHistory: updatedQuestion.userHistory
      };
      console.log("Updating user question progress:", payload);
      const res = await fetch(`${API_BASE}/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log("Update user question response:", res.status, res.statusText);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("Update user question failed:", errBody);
        throw new Error(errBody.error || 'Failed to update question progress');
      }
      return true;
    }
  } catch (error) {
    console.error('updateQuestion error:', error);
    throw error;
  }
}

export async function deleteQuestion(id) {
  try {
    const res = await fetch(API_BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error('Failed to delete question');
    return true;
  } catch (error) {
    console.error('deleteQuestion error:', error);
    throw error;
  }
}

// Reset all question progress for a user (used in fresh start)
export async function resetUserQuestionProgress(userId) {
  try {
    const res = await fetch(`${API_BASE}/user`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to reset progress');
    return true;
  } catch (error) {
    console.error('resetUserQuestionProgress error:', error);
    throw error;
  }
}
// Governance Methods
export async function submitForReview(versionId, notes = "") {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  try {
    const res = await fetch(`${API_BASE}/governance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', versionId, userId, notes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit for review');
    }
    return true;
  } catch (error) {
    console.error('submitForReview error:', error);
    throw error;
  }
}

export async function approveQuestion(versionId, notes = "") {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  try {
    const res = await fetch(`${API_BASE}/governance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', versionId, userId, notes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve question');
    }
    return true;
  } catch (error) {
    console.error('approveQuestion error:', error);
    throw error;
  }
}

export async function deprecateQuestion(versionId, reason = "") {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  try {
    const res = await fetch(`${API_BASE}/governance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deprecate', versionId, userId, notes: reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to deprecate question');
    }
    return true;
  } catch (error) {
    console.error('deprecateQuestion error:', error);
    throw error;
  }
}

export async function getGovernanceHistory(versionId = null, conceptId = null) {
  try {
    let url = `${API_BASE}/governance/history`;
    if (versionId) url += `?versionId=${versionId}`;
    else if (conceptId) url += `?conceptId=${conceptId}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch governance history');
    return await res.json();
  } catch (error) {
    console.error('getGovernanceHistory error:', error);
    return [];
  }
}

// Lifecycle Management (Updated)
export async function reviseQuestion(versionId, notes = "") {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  try {
    const res = await fetch(`${API_BASE}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, userId, notes })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revise question');
    }
    return await res.json();
  } catch (error) {
    console.error('reviseQuestion error:', error);
    throw error;
  }
}

export async function publishQuestion(versionId, notes = "") {
  const userId = typeof window !== 'undefined' ? localStorage.getItem("medbank_user") : null;
  try {
    const res = await fetch(`${API_BASE}/governance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', versionId, userId, notes })
    });
    if (!res.ok) {
      const text = await res.text();
      let err;
      try {
        err = text ? JSON.parse(text) : { error: `Request failed with status ${res.status}` };
      } catch (e) {
        err = { error: text || res.statusText };
      }
      throw new Error(err.error || 'Failed to publish question');
    }
    return true;
  } catch (error) {
    console.error('publishQuestion error:', error);
    throw error;
  }
}

export async function updateQuestionStats(versionId, stats) {
  try {
    const res = await fetch(`${API_BASE}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, stats })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update stats');
    }
    return true;
  } catch (error) {
    console.error('updateQuestionStats error:', error);
    throw error;
  }
}
