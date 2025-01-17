document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('generate-form').addEventListener('submit', function (e) {
        e.preventDefault();

        // Generar código CSV
        const date = new Date();
        const dateString = date.toISOString().split('T')[0].replace(/-/g, '').toUpperCase();
        const timeString = date.toTimeString().split(' ')[0].replace(/:/g, '').substr(0, 4).toUpperCase();
        const randomString = Math.random().toString(36).substring(2, 14).toUpperCase();
        const csvCode = `${dateString}${timeString}${randomString}`;

        document.getElementById('csv-code').textContent = csvCode;

        // Generar código de expediente
        const expediente = `${date.getFullYear()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0').toUpperCase()}`;
        const registroFecha = date.toISOString().split('T')[0];

        // Mostrar la fecha de registro y el expediente
        document.getElementById('registro-fecha').textContent = registroFecha;
        document.getElementById('expediente').textContent = expediente;

        // Generar código QR
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, `https://tuweb.com/verificar?csv=${csvCode}&expediente=${expediente}`);

        // Registrar datos
        const registro = { csvCode, date: date.toISOString(), expediente, registroFecha };
        localStorage.setItem(expediente, JSON.stringify(registro));

        console.log(registro);
    });
});
