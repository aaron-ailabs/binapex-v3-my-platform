import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const ua = navigator.userAgent.toLowerCase();
const ios = /iphone|ipad|ipod/.test(ua);
const android = /android/.test(ua);
document.documentElement.setAttribute("data-platform", ios ? "ios" : android ? "android" : "web");

createRoot(document.getElementById("root")!).render(<App />);
