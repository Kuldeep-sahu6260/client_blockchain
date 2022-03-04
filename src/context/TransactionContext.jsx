import React,{ useState, useEffect} from 'react';
import {ethers} from 'ethers';
import {contractABI,contractAddress} from "../utils/constants";

export const TransactionContext = React.createContext();

const {ethereum} = window;

const createEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionsContract = new ethers.Contract(contractAddress, contractABI, signer);
    // console.log({provider,signer,transactionContext})

    return transactionsContract;
  };

  

export const TransactionProvider = ({children})=>{
    const [currentAccount,setCurrentAccount] = useState("");
    const [formData,setFormData] = useState({addressTo: "", amount: "", keyword: "", message: ""});
    const [isLoading,setIsLoading] = useState(false);
    const [transactions,setTransactions] = useState([]);
    const [transactionCount,setTransactionCount] = useState(localStorage.getItem('transactionCount'));

    const handleChange = (e, name) => {
        setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
      };

      const getAllTransactions = async () => {
        try {
          if (ethereum) {
            const transactionsContract = createEthereumContract();
    
            const availableTransactions = await transactionsContract.getAllTransactions();
            console.log(availableTransactions,"hllo");
    
            const structuredTransactions = availableTransactions.map((transaction) => ({
              addressTo: transaction.receiver,
              addressFrom: transaction.sender,
              timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),// return time and date givn formate in transactiion section
              message: transaction.message,
              keyword: transaction.keyword,
              amount: parseInt(transaction.amount._hex) / (10 ** 18)// hexdecimal to gwei to ether divide 10 power 18
            }));
    
            console.log(structuredTransactions);
    
            setTransactions(structuredTransactions);
          } else {
            console.log("Ethereum is not present");
          }
        } catch (error) {
          console.log(error);
        }
      };
    const checkIfWalletIsConnected = async () => {
        try {
            if (!ethereum) return alert("Please install MetaMask.");
      
            const accounts = await ethereum.request({ method: "eth_accounts" });
      
            if (accounts.length) {
              setCurrentAccount(accounts[0]);
      
              getAllTransactions();
            } else {
              console.log("No accounts found");
            }
          } catch (error) {
            console.log(error);
          }
    }

    const connectWallet = async () => {
        try {
          if (!ethereum) return alert("Please install MetaMask.");
    
          const accounts = await ethereum.request({ method: "eth_requestAccounts", });
    
          console.log(accounts);
          setCurrentAccount(accounts[0]);
        } catch (error) {
          console.log(error);
    
          throw new Error("No ethereum object");
        }
      };

      const checkIfTransactionsExists = async () => {
        try {
          if (ethereum) {
            const transactionsContract = createEthereumContract();
            const currentTransactionCount = await transactionsContract.getTransactionCount();
    
            window.localStorage.setItem("transactionCount", currentTransactionCount);
          }
        } catch (error) {
          console.log(error);
    
          throw new Error("No ethereum object");
        }
      };

    const sendTransaction = async()=>{
        try {
            if (ethereum) {
              const { addressTo, amount, keyword, message } = formData;
              const transactionsContract = createEthereumContract();
              const parsedAmount = ethers.utils.parseEther(amount);// convert decimal to gwei
      
              await ethereum.request({
                method: "eth_sendTransaction",
                params: [{
                  from: currentAccount,
                  to: addressTo,
                  gas: "0x5208",//21000 gwei
                  value: parsedAmount._hex,// chnage into hexdecial
                }],
              });
      
              const transactionHash = await transactionsContract.addToBlockChain(addressTo, parsedAmount, message, keyword);
      
              setIsLoading(true);
              console.log(`Loading - ${transactionHash.hash}`);
              await transactionHash.wait();
              console.log(`Success - ${transactionHash.hash}`);
              setIsLoading(false);
      
              const transactionsCount = await transactionsContract.getTransactionCount();
      
              setTransactionCount(transactionsCount.toNumber());
              window.reload();
            } else {
              console.log("No ethereum object");
            }
            
        } catch (error) {
            console.log(error);
    
            throw new Error("No ethereum object");
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionsExists();

    },[transactionCount])
    return (
        <TransactionContext.Provider value={{connectWallet,currentAccount,sendTransaction,formData,handleChange,transactions,isLoading}}
        >
            {children}

        </TransactionContext.Provider>
    )

}