document.addEventListener('DOMContentLoaded', function () {
    // Constante para hash de la pass de admin
    const adminPassword = 'hashedPassword'; 

    // Función para comprobar que el administrador está logueado
    document.getElementById('login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        if (password === adminPassword) { // Sustituir con comparación de hash en un entorno real
            document.getElementById('admin-content').style.display = 'block';
            this.style.display = 'none';

            // Mostrar CSV generados
            const csvList = document.getElementById('csv-list');
            csvList.innerHTML = '';
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = JSON.parse(localStorage.getItem(key));
                const li = document.createElement('li');
                li.textContent = `Expediente: ${key}, CSV: ${value.csvCode}, Fecha: ${value.registroFecha}`;
                csvList.appendChild(li);
            }
        } else {
            alert('Contraseña incorrecta');
        }
    });
});
