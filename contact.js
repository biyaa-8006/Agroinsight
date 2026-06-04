document.querySelector('.submit-btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const card = document.querySelector('.form-card');
  const inputs = card?.querySelectorAll('input, textarea, select');
  if (!inputs || inputs.length < 5) return;

  const first = inputs[0].value.trim();
  const last = inputs[1].value.trim();
  const email = inputs[2].value.trim();
  const subject = inputs[4].value.trim();
  const message = inputs[5].value.trim();

  try {
    await submitContact({
      name: first + ' ' + last,
      email,
      subject,
      message,
    });
    alert('Message sent successfully.');
    card.querySelectorAll('input, textarea').forEach((el) => { el.value = ''; });
  } catch (err) {
    alert(err.message || 'Failed to send message.');
  }
});
