import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : window.location.origin;

// JWT is in an HTTP-only cookie — sent automatically with withCredentials (not readable from JS)
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

export default socket;
