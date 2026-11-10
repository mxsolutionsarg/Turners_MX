function showToast(message, type = "info") {
  const colors = {
    success: "linear-gradient(to right, #00b09b, #96c93d)",
    error: "linear-gradient(to right, #ff5f6d, #ffc371)",
    info: "linear-gradient(to right, #2193b0, #6dd5ed)"
  };

  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",   // top o bottom
    position: "right",// left, center o right
    stopOnFocus: true,
    style: {
      background: colors[type] || colors.info,
      borderRadius: "8px",
      fontSize: "0.9rem"
    }
  }).showToast();
}
