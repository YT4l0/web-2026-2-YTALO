export interface UserDocument {
  _id: string;
  email: string;
  phone?: string;
  passwordHash: string;
  name: string;
  accountType: 'pf' | 'pj';
  createdAt: string;
}

const NOSQL_USERS_KEY = 'motorlocal_nosql_users_collection';
const NOSQL_SESSION_KEY = 'motorlocal_nosql_current_session';

const INITIAL_USERS: UserDocument[] = [
  {
    _id: 'doc_walber_2026',
    email: 'auladewalber@gmail.com',
    phone: '(84) 99999-1234',
    passwordHash: 'aula123',
    name: 'Walber',
    accountType: 'pf',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Initializes the local NoSQL "users" document store if not present.
 */
function getCollection(): UserDocument[] {
  try {
    const raw = localStorage.getItem(NOSQL_USERS_KEY);
    if (!raw) {
      localStorage.setItem(NOSQL_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse NoSQL collection:', err);
    return INITIAL_USERS;
  }
}

/**
 * Saves document collection back to storage.
 */
function saveCollection(docs: UserDocument[]) {
  try {
    localStorage.setItem(NOSQL_USERS_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error('Failed to save NoSQL collection:', err);
  }
}

/**
 * Simulates a NoSQL findOne query: db.users.findOne({ $or: [{ email: query }, { phone: query }], passwordHash: pass })
 */
export async function noSqlFindOneUser(
  emailOrPhoneQuery: string,
  passwordInput: string
): Promise<UserDocument | null> {
  // Simulate asynchronous database latency (500ms)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const collection = getCollection();
  const normalizedQuery = emailOrPhoneQuery.trim().toLowerCase();

  const matchedUser = collection.find(
    (doc) =>
      (doc.email.toLowerCase() === normalizedQuery ||
        (doc.phone && doc.phone.replace(/\D/g, '') === normalizedQuery.replace(/\D/g, ''))) &&
      doc.passwordHash === passwordInput
  );

  return matchedUser || null;
}

/**
 * Simulates a NoSQL insertOne document operation: db.users.insertOne(newDoc)
 */
export async function noSqlInsertUser(
  user: Omit<UserDocument, '_id' | 'createdAt'>
): Promise<UserDocument> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const collection = getCollection();

  const newDoc: UserDocument = {
    ...user,
    _id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  collection.push(newDoc);
  saveCollection(collection);
  return newDoc;
}

/**
 * Session persistence helpers
 */
export function getActiveSession(): UserDocument | null {
  try {
    const session = localStorage.getItem(NOSQL_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(user: UserDocument | null) {
  if (user) {
    localStorage.setItem(NOSQL_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(NOSQL_SESSION_KEY);
  }
}
