import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import ClassicEditor from "@/pages/ClassicEditor";
import Gallery from "@/pages/Gallery";
import CodeMap from "@/pages/CodeMap";

function App() {
  return (
    <div className="App dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/classic" element={<ClassicEditor modern={false} />} />
          <Route path="/modern" element={<ClassicEditor modern={true} />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/codemap" element={<CodeMap />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
