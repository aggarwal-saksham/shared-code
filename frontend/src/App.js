import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

const SERVER_URL = "http://localhost:5000";

function App() {
  const [docId, setDocId] = useState("");
  const [docName, setDocName] = useState("");
  const [editor, setEditor] = useState(null);
  const editorRef = useRef();
  const socketRef = useRef();
  const [loading, setLoading] = useState(false);

  // Initialize socket and editor
  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    if (editorRef.current && !editor) {
      const cm = CodeMirror(editorRef.current, {
        value: "",
        lineNumbers: true,
        mode: "javascript"
      });
      setEditor(cm);
    }
  }, [editor]);

  // Join document and set up collaborative editing
  useEffect(() => {
    if (!docId || !editor) return;
    setLoading(true);

    axios.get(`${SERVER_URL}/api/documents/${docId}`)
      .then(res => {
        editor.setValue(res.data.content || "");
        setDocName(res.data.name);
        setLoading(false);
      });

    socketRef.current.emit("join-document", docId);

    editor.on("change", () => {
      const value = editor.getValue();
      socketRef.current.emit("edit-document", { documentId: docId, content: value });
    });

    socketRef.current.on("receive-changes", content => {
      if (content !== editor.getValue()) {
        editor.setValue(content);
      }
    });

    return () => {
      socketRef.current.off("receive-changes");
    };
  }, [docId, editor]);

  // Create new document
  const createDocument = async () => {
    setLoading(true);
    const res = await axios.post(`${SERVER_URL}/api/documents`, {
      name: docName,
      content: ""
    });
    setDocId(res.data._id);
    setLoading(false);
  };

  return (
    <div>
      <h2>Collaborative Code Editor</h2>
      {!docId && (
        <div>
          <input
            type="text"
            placeholder="Document Name"
            value={docName}
            onChange={e => setDocName(e.target.value)}
          />
          <button onClick={createDocument} disabled={loading || !docName}>
            Create Document
          </button>
        </div>
      )}
      {docId && (
        <div>
          <h4>Document: {docName}</h4>
          <div ref={editorRef} style={{ border: "1px solid #ccc", height: "400px" }} />
        </div>
      )}
    </div>
  );
}

export default App;