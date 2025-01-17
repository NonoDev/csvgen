document.addEventListener('DOMContentLoaded', () => {
    //obtengo el formulario
    const verifyForm = document.getElementById('verify-form');

    // funcion para verificar que todos los campos del formulario están correctamente almacenados
    verifyForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const csvCode = document.getElementById('csv-code').value;
        const fecha = document.getElementById('fecha').value;
        const expediente = document.getElementById('expediente').value;

        try {
            const response = await fetch('/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvCode, fecha, expediente }),
            });

            const result = await response.json();

            if (result.valid) {
                const successModal = M.Modal.getInstance(document.getElementById('success-modal'));
                successModal.open();
            } else {
                const errorModal = M.Modal.getInstance(document.getElementById('error-modal'));
                errorModal.open();
            }
        } catch (error) {
            console.error('Error verificando el código:', error);
        }
    });

    // Inicializar los modales de Materialize
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
});
