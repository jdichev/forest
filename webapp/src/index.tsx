import { createRoot } from "react-dom/client";

import "bootstrap-icons/font/bootstrap-icons.css";
import "./style/index.css";

import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
