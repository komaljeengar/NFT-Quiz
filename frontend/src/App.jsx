import { useState, useEffect } from "react";
import axios from "axios";
import Confetti from "react-confetti";
import { ethers } from "ethers";

function App() {
  const [wallet, setWallet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [minting, setMinting] = useState(false);

  const contractAddress = "0xD942bd05cD24BB202AB8F0fF0b944003cC55B9b3"; 
  const contractABI = [
    {
      inputs: [{ internalType: "address", name: "to", type: "address" }],
      name: "mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/quiz")
      .then((res) => setQuestions(res.data))
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);
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
    if (Object.keys(answers).length < 5) {
      setError("Answer all questions");
      return;
    }
    try {
      setError(null);
      const res = await axios.post("http://localhost:3001/api/quiz/submit", { wallet, answers });
      setResult(res.data);
      if (res.data.success) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
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
      if (!window.ethereum) throw new Error("MetaMask not installed");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.mint(wallet);
      const receipt = await tx.wait();
      setResult({ ...result, minted: true, txHash: receipt.hash });
    } catch (err) {
      setError("Minting failed: " + err.message);
    } finally {
      setMinting(false);
    }

    
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      {showConfetti && <Confetti />}
      <h1 className="text-3xl font-bold mb-6">EduMint Quiz</h1>
      {!wallet ? (
        <button
          onClick={connectWallet}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Connect MetaMask
        </button>
      ) : (
        <p className="mb-4">Wallet: {wallet.slice(0, 6)}...{wallet.slice(-4)}</p>
      )}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {questions.length > 0 && !result && (
        <div className="w-full max-w-md bg-white p-6 rounded shadow">
          {questions.map((q) => (
            <div key={q.id} className="mb-4">
              <p className="font-semibold" dangerouslySetInnerHTML={{ __html: q.question }} />
              {q.answers.map((ans, i) => (
                <label key={i} className="block">
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    value={ans}
                    onChange={() => handleAnswer(q.id, ans)}
                    className="mr-2"
                  />
                  <span dangerouslySetInnerHTML={{ __html: ans }} />
                </label>
              ))}
            </div>
          ))}
          <button
            onClick={submitQuiz}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Submit Quiz
          </button>
        </div>
      )}
      {result && (
        <div className="text-center">
          <p className={result.success ? "text-green-500" : "text-red-500"}>
            {result.success
              ? `Passed! Score: ${result.score}%`
              : `Failed. Score: ${result.score}%. Try again tomorrow!`}
          </p>
          {result.success && !result.minted && (
            <button
              onClick={mintNFT}
              disabled={minting}
              className="mt-4 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              {minting ? "Minting..." : "Mint NFT"}
            </button>
          )}
          {result.minted && (
            <p className="text-blue-500 mt-2">
              NFT minted!{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Etherscan
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;