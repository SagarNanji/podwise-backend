export interface User {
  _id?: string;
  name?: string;
  password?: string; // Do NOT include plaintext password on the client
  email?: string;
  company?: string;
  title?: string;
  bio?: string;
  createdAt?: string; // usually ISO string from API
}
