export async function verifyLogin(email: string, password: string) {
  const res = await fetch('/api/verifyLogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }

  return res.json(); // returns { email, name }
}
