import { createRoot } from "react-dom/client";

import "./style/index.scss";

import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
