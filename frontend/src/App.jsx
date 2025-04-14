import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import Confetti from "react-confetti";

function App() {
  const [wallet, setWallet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [minting, setMinting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  const contractABI = [
    {
      inputs: [{ internalType: "address", name: "to", type: "address" }],
      name: "mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  useEffect(() => {
    // Fetch quiz questions on load
    axios
      .get("http://localhost:3001/api/quiz")
      .then((res) => setQuestions(res.data))
      .catch(() => setError("Failed to load quiz"));
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []); // Request wallet access
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
      setError(null);
    } catch (err) {
      setError("Failed to connect wallet: " + err.message);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const submitQuiz = async () => {
    if (!wallet) {
      setError("Please connect wallet");
      return;
    }
    if (Object.keys(answers).length < questions.length) {
      setError("Answer all questions");
      return;
    }
    try {
      setError(null);
      const res = await axios.post("http://localhost:3001/api/quiz/submit", {
        wallet,
        answers
      });
      setResult(res.data);
      if (res.data.success) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000); // Confetti for 5s
      }
    } catch (err) {
      setError(err.response?.data.error || "Submission failed");
    }
  };

  const mintNFT = async () => {
    if (!result?.success) return;
    try {
      setMinting(true);
      setError(null);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.mint(wallet);
      await tx.wait();
      setResult({ ...result, minted: true });
      alert("NFT minted successfully!");
    } catch (err) {
      setError("Minting failed: " + err.message);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {showConfetti && <Confetti />}
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">EduMint Quiz</h1>
        {!wallet ? (
          <button
            onClick={connectWallet}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          >
            Connect MetaMask
          </button>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </p>
        )}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        {questions.length > 0 && !result && (
          <div>
            {questions.map((q) => (
              <div key={q.id} className="mb-6">
                <p
                  className="font-semibold mb-2"
                  dangerouslySetInnerHTML={{ __html: q.question }}
                />
                {q.answers.map((ans, i) => (
                  <label key={i} className="block mb-1">
                    <input
                      type="radio"
                      name={`q${q.id}`}
                      value={ans}
                      onChange={() => handleAnswer(q.id, ans)}
                      className="mr-2 accent-blue-500"
                    />
                    <span dangerouslySetInnerHTML={{ __html: ans }} />
                  </label>
                ))}
              </div>
            ))}
            <button
              onClick={submitQuiz}
              className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
            >
              Submit Quiz
            </button>
          </div>
        )}
        {result && (
          <div className="text-center">
            <p className="text-lg mb-4">
              {result.success
                ? `Passed! Score: ${result.score}%`
                : `Failed. Score: ${result.score}%. Try again tomorrow!`}
            </p>
            {result.success && !result.minted && (
              <button
                onClick={mintNFT}
                disabled={minting}
                className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition disabled:opacity-50"
              >
                {minting ? "Minting..." : "Mint NFT"}
              </button>
            )}
            {result.minted && (
              <p className="text-green-600 font-semibold">
                NFT minted! Check your wallet or OpenSea testnet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;