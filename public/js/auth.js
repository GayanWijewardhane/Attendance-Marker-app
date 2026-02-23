function toggleView(viewId) {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'none';
    document.getElementById(viewId).style.display = 'block';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            const err = document.getElementById('loginError');
            err.textContent = data.error;
            err.style.display = 'block';
        } else {
            localStorage.setItem('attendance_token', data.accessToken);
            localStorage.setItem('attendance_user', JSON.stringify(data.user));
            window.location.href = '/';
        }
    } catch (err) {
        document.getElementById('loginError').textContent = 'Network error';
        document.getElementById('loginError').style.display = 'block';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            const err = document.getElementById('registerError');
            err.textContent = data.error;
            err.style.display = 'block';
        } else {
            alert('Registration successful. Please login.');
            toggleView('loginBox');
        }
    } catch (err) {
        document.getElementById('registerError').textContent = 'Network error';
        document.getElementById('registerError').style.display = 'block';
    }
});
