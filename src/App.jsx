import { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [csvData, setCsvData] = useState([]);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [intervalTime, setIntervalTime] = useState(30);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [timeoutRefs, setTimeoutRefs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileToUpload, setFileToUpload] = useState(false);
  const [isFinished, setIsFinished] = useState(false); // Menandakan proses selesai

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileToUpload(file);
    }
  };

  const proceedWithFileUpload = () => {
    setShowModal(false);
    if (fileToUpload) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split('\n').slice(1);
        const parsedData = rows.map(row => {
          const columns = row.split(',');
          if (columns.length === 2) {
            const name = columns[0].replace(/"/g, '').trim();
            const number = columns[1].trim();
            return { name, number };
          }
          return null;
        }).filter(item => item !== null);
        
        const limitedData = parsedData.slice(0, 150);
        setCsvData(limitedData);
      };
      reader.readAsText(fileToUpload);
    }
  };

  const handleSendMessages = () => {
    if (!messageTemplate) {
      setErrorMessage('Template pesan belum diatur.');
      setShowErrorModal(true);
      return;
    }

    if (csvData.length === 0) {
      setErrorMessage('Belum ada data yang diupload.');
      setShowErrorModal(true);
      return;
    }

    setIsSending(true);
    setIsPaused(false);
    setIsFinished(false); // Reset status selesai
    const startIndex = isPaused ? currentProgress : 0;
    const newTimeoutRefs = [];

    csvData.slice(startIndex).forEach((contact, index) => {
      const timeoutRef = setTimeout(() => {
        const personalizedMessage = messageTemplate.replace('[name]', contact.name);
        const data = {
          deviceId: 'd_ID@66bb26a20eec3_Xn4FqJdB9TYq7',
          number: contact.number,
          message: personalizedMessage,
        };

        axios.post('https://crm.woo-wa.com/send/message-text', data)
          .then(response => {
            console.log(`Pesan terkirim ke ${contact.name}:`, response.data);
          })
          .catch(error => {
            console.error(`Gagal mengirim pesan ke ${contact.name}:`, error.response ? error.response.data : error.message);
          });

        const newProgress = startIndex + index + 1;
        setCurrentProgress(newProgress);

        // Cek jika semua pesan telah terkirim
        if (newProgress >= csvData.length) {
          setIsFinished(true);
          setIsSending(false);
          setIsPaused(false);
        }
      }, index * intervalTime * 1000);

      newTimeoutRefs.push(timeoutRef);
    });

    setTimeoutRefs(newTimeoutRefs);
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsSending(false);
    timeoutRefs.forEach(timeoutRef => clearTimeout(timeoutRef));
  };

  const handleResume = () => {
    setIsPaused(false);
    handleSendMessages();
  };

  const handleStop = () => {
    setIsSending(false);
    setIsPaused(false);
    timeoutRefs.forEach(timeoutRef => clearTimeout(timeoutRef));

    setCsvData([]);
    setMessageTemplate('');
    setIntervalTime(30);
    setCurrentProgress(0);
    setIsFinished(false);
  };

  const handleCancelUpload = () => {
    setShowModal(false);
    setFileToUpload(null);
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const handleFinish = () => {
    window.location.reload(); // Refresh halaman
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Bot Broadcast</h1>

      {/* Upload CSV */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">Upload CSV File</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="p-2 border border-gray-300 rounded"
          disabled={isSending} // Menonaktifkan input saat pengiriman sedang berlangsung
        />
        {fileToUpload && (
          <button
            onClick={() => setShowModal(true)} // Tampilkan modal ketika tombol Upload ditekan
            className={`mt-2 px-4 py-2 rounded ${isSending ? 'bg-blue-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white'}`}
            disabled={isSending} // Menonaktifkan tombol saat pengiriman sedang berlangsung
          >
            Upload
          </button>
        )}
      </div>

      {/* Tampilkan Data CSV */}
      <table className="min-w-full bg-white mb-6">
        <thead>
          <tr>
            <th className="py-2">No.</th>
            <th className="py-2">Name</th>
            <th className="py-2">Number</th>
          </tr>
        </thead>
        <tbody>
          {csvData.length > 0 ? (
            csvData.map((contact, index) => (
              <tr key={index}>
                <td className="py-2 px-4">{index + 1}</td>
                <td className="py-2 px-4">{contact.name}</td>
                <td className="py-2 px-4">{contact.number}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="py-2 px-4 text-center" colSpan="3">Belum ada data</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Template Pesan */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">Pesan Template</label>
        <textarea
          value={messageTemplate}
          onChange={(e) => setMessageTemplate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Masukkan pesan dengan [name] untuk memanggil nama"
          disabled={isSending && !isPaused} // Nonaktifkan saat pengiriman berlangsung
        />
      </div>

      {/* Pengaturan Interval */}
      <div className="mb-6">
        <label className="block font-medium text-gray-700 mb-2">Interval Waktu (detik)</label>
        <input
          type="number"
          value={intervalTime}
          onChange={(e) => setIntervalTime(Math.max(30, e.target.value))}
          className="w-full p-2 border border-gray-300 rounded"
          min="30"
          disabled={isSending && !isPaused} // Nonaktifkan saat pengiriman berlangsung
        />
      </div>

      {/* Tombol Kirim Pesan */}
      {!isSending && !isPaused && !isFinished && (
        <button
          onClick={handleSendMessages}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Mulai Kirim Pesan
        </button>
      )}

      {/* Tombol Pause, Resume, dan Stop */}
      {isSending && !isPaused && (
        <div className="mt-4">
          <button
            onClick={handlePause}
            className="px-4 py-2 bg-yellow-500 text-white rounded mr-2"
          >
            Jeda
          </button>
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Hentikan
          </button>
        </div>
      )}

      {isPaused && (
        <button
          onClick={handleResume}
          className="px-4 py-2 bg-green-500 text-white rounded mt-4"
        >
          Lanjutkan
        </button>
      )}

      {/* Progres Pengiriman */}
      <div className="mt-4">
        {isSending || isPaused ? (
          <p>{isFinished ? "Proses pengiriman selesai." : `Proses pengiriman: ${currentProgress}/${csvData.length}`}</p>
        ) : (
          <p>Proses pengiriman belum dimulai.</p>
        )}
      </div>

      {/* Modal Upload CSV */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-bold">Peringatan !</h2>
            <p>Aplikasi hanya menerima 150 data dari file yang anda upload</p>
            <div className="mt-4">
              <button onClick={proceedWithFileUpload} className="px-4 py-2 bg-blue-500 text-white rounded mr-2">Lanjutkan</button>
              <button onClick={handleCancelUpload} className="px-4 py-2 bg-gray-300 rounded">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Error */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-bold">Error</h2>
            <p>{errorMessage}</p>
            <button onClick={handleCloseErrorModal} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Selesai */}
      {isFinished && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-bold">Selesai</h2>
            <p>Semua pesan telah dikirim!</p>
            <button onClick={handleFinish} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Reload Halaman</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
