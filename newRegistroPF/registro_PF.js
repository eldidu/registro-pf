// Sistema de almacenamiento con gestión mensual para Registro PF
class SistemaRegistroPF {
    constructor() {
        this.claveBase = 'registro_pf_';
        this.verificarNuevoMes();
    }

    // Obtener la clave para el mes actual
    obtenerClaveMes(fecha = new Date()) {
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        return `${this.claveBase}${año}-${mes}`;
    }

    // Obtener lista de meses con datos
    obtenerMesesConDatos() {
        const meses = [];
        for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (clave.startsWith(this.claveBase)) {
                meses.push(clave.replace(this.claveBase, ''));
            }
        }
        return meses.sort();
    }

    // Guardar registro
    guardarRegistro(datos) {
        const claveMes = this.obtenerClaveMes();
        const registros = this.obtenerRegistrosMes(claveMes);
        
        // Agregar ID, timestamp y fecha automática
        const nuevoRegistro = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            fecha: new Date().toLocaleString('es-MX'),
            ...datos
        };
        
        registros.push(nuevoRegistro);
        localStorage.setItem(claveMes, JSON.stringify(registros));
        
        return nuevoRegistro;
    }

    // Obtener registros de un mes específico
    obtenerRegistrosMes(claveMes = null) {
        const clave = claveMes || this.obtenerClaveMes();
        const datos = localStorage.getItem(clave);
        return datos ? JSON.parse(datos) : [];
    }

    // Obtener TODOS los registros
    obtenerTodosLosRegistros() {
        const meses = this.obtenerMesesConDatos();
        let todosLosRegistros = [];
        
        meses.forEach(mes => {
            const registrosMes = this.obtenerRegistrosMes(this.claveBase + mes);
            todosLosRegistros = todosLosRegistros.concat(registrosMes);
        });
        
        return todosLosRegistros;
    }

    // Verificar y crear nuevo mes si es necesario
    verificarNuevoMes() {
        const ultimaVerificacion = localStorage.getItem('ultima_verificacion_mes_pf');
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        if (!ultimaVerificacion || new Date(ultimaVerificacion) < primerDiaMes) {
            const claveMesActual = this.obtenerClaveMes();
            if (!localStorage.getItem(claveMesActual)) {
                localStorage.setItem(claveMesActual, JSON.stringify([]));
            }
            localStorage.setItem('ultima_verificacion_mes_pf', hoy.toISOString());
        }
    }

    // Crear nuevo mes manualmente
    crearNuevoMesManual() {
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        const claveProximoMes = this.obtenerClaveMes(proximoMes);
        
        if (!localStorage.getItem(claveProximoMes)) {
            localStorage.setItem(claveProximoMes, JSON.stringify([]));
            return true;
        }
        return false;
    }

    // Exportar datos a formato Excel (CSV)
    exportarExcel(claveMes = null) {
        const clave = claveMes || this.obtenerClaveMes();
        const registros = this.obtenerRegistrosMes(clave);
        
        if (registros.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const cabeceras = ['Analista', 'Localizador', 'Canal', 'Monto', 'Fecha', 'Observaciones'];
        let csv = cabeceras.join(',') + '\n';
        
        registros.forEach(registro => {
            const fila = [
                `"${registro.analista}"`,
                registro.localizador,
                `"${registro.canal}"`,
                registro.monto,
                `"${registro.fecha}"`,
                `"${registro.observaciones.replace(/"/g, '""')}"`
            ];
            csv += fila.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `registros_pf_${clave.replace(this.claveBase, '')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Instancia global del sistema
const sistemaPF = new SistemaRegistroPF();

// =============================================
// 📝 MANEJO DEL FORMULARIO
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('form');
    if (formulario) {
        formulario.addEventListener('submit', manejarEnvioFormulario);
    }
});

function manejarEnvioFormulario(evento) {
    evento.preventDefault();
    
    const datos = {
        analista: document.getElementById('analista').value,
        localizador: document.getElementById('localizador').value,
        canal: document.getElementById('canal').value,
        monto: parseFloat(document.getElementById('monto').value),
        observaciones: document.getElementById('observaciones').value
    };

    // Validaciones
    if (datos.localizador <= 0) {
        mostrarMensaje('El localizador debe ser un número válido', 'error');
        return;
    }

    if (datos.monto <= 0) {
        mostrarMensaje('El monto debe ser mayor a 0', 'error');
        return;
    }

    try {
        sistemaPF.guardarRegistro(datos);
        mostrarMensaje('✅ Registro guardado exitosamente', 'exito');
        document.getElementById('form').reset();
        
    } catch (error) {
        console.error('Error al guardar:', error);
        mostrarMensaje('❌ Error al guardar el registro', 'error');
    }
}

function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    if (mensajeDiv) {
        mensajeDiv.textContent = texto;
        mensajeDiv.className = `mensaje ${tipo}`;
        
        setTimeout(() => {
            mensajeDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback para alert simple
        alert(texto);
    }
}

// =============================================
// 🗑️ FUNCIÓN PARA ELIMINAR DATOS
// =============================================

function limpiarRegistros() {
    if (confirm('¿ESTÁS SEGURO DE ELIMINAR TODOS LOS REGISTROS?\n\n🚫 ESTA ACCIÓN NO SE PUEDE DESHACER\n\nSe eliminarán todos los datos de todos los meses.')) {
        
        // Obtener todos los meses con datos
        const meses = sistemaPF.obtenerMesesConDatos();
        let totalRegistros = 0;
        
        // Contar registros totales
        meses.forEach(mes => {
            const registros = sistemaPF.obtenerRegistrosMes(sistemaPF.claveBase + mes);
            totalRegistros += registros.length;
        });
        
        if (totalRegistros === 0) {
            alert('No hay registros para eliminar.');
            return;
        }
        
        if (confirm(`⛔ ELIMINACIÓN DEFINITIVA\n\nSe eliminarán:\n• ${totalRegistros} registros\n• ${meses.length} meses de datos\n\n¿CONTINUAR?`)) {
            
            // Eliminar todos los datos
            meses.forEach(mes => {
                localStorage.removeItem(sistemaPF.claveBase + mes);
            });
            localStorage.removeItem('ultima_verificacion_mes_pf');
            
            // Mostrar confirmación
            alert(`✅ Eliminación completada:\n\n🗑️ ${totalRegistros} registros eliminados\n📅 ${meses.length} meses limpiados`);
            
            // Recargar si está en hoja de cálculo
            if (window.location.pathname.includes('hoja-calculo')) {
                location.reload();
            }
        }
    }
}

// =============================================
// 🔄 FUNCIONES DE NAVEGACIÓN
// =============================================

function verRegistros() {
    window.location.href = 'hoja-calculo.html';
}

function volverAlFormulario() {
    window.location.href = 'index.html';
}

function exportarExcel() {
    sistemaPF.exportarExcel();
}

function crearNuevoMes() {
    if (sistemaPF.crearNuevoMesManual()) {
        alert('¡Nuevo mes creado exitosamente!');
        if (window.location.pathname.includes('hoja-calculo')) {
            location.reload();
        }
    } else {
        alert('El mes siguiente ya existe o no se pudo crear.');
    }
}