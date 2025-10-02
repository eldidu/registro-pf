// Sistema de almacenamiento con JSONBin para Registro PF
class SistemaRegistroPF {
    constructor() {
        this.apiKey = '$2a$10$0d.rrfbHWYHJmgCvUUAIzOQU82UEiqgGaMqocCJ3tVMqjioaKkFWO';
        this.binId = '68def594d0ea881f409352b6';
        this.baseURL = 'https://api.jsonbin.io/v3/b';
        this.claveBase = 'registro_pf_';
        this.verificarNuevoMes();
        this.inicializarJSONBin();
    }

    // Inicializar conexión con JSONBin
    async inicializarJSONBin() {
        try {
            const response = await fetch(`${this.baseURL}/${this.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // Si no existe el bin, crearlo
                await this.crearBinInicial();
            }
        } catch (error) {
            console.error('Error inicializando JSONBin:', error);
        }
    }

    // Crear bin inicial si no existe
    async crearBinInicial() {
        const datosIniciales = {
            [this.obtenerClaveMes()]: []
        };
        
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey,
                    'X-Bin-Name': 'Registro PF - Datos Compartidos'
                },
                body: JSON.stringify(datosIniciales)
            });
            
            const data = await response.json();
            if (data.metadata && data.metadata.id) {
                this.binId = data.metadata.id;
                // Guardar el binId en localStorage para uso futuro
                localStorage.setItem('jsonbin_pf_id', this.binId);
            }
        } catch (error) {
            console.error('Error creando bin inicial:', error);
        }
    }

    // Obtener todos los datos de JSONBin
    async obtenerTodosLosDatos() {
        try {
            const response = await fetch(`${this.baseURL}/${this.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.record || {};
            }
        } catch (error) {
            console.error('Error obteniendo datos:', error);
        }
        return {};
    }

    // Guardar todos los datos en JSONBin
    async guardarTodosLosDatos(datos) {
        try {
            const response = await fetch(`${this.baseURL}/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(datos)
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error guardando datos:', error);
            return false;
        }
    }

    // Obtener la clave para el mes actual
    obtenerClaveMes(fecha = new Date()) {
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        return `${this.claveBase}${año}-${mes}`;
    }

    // Obtener lista de meses con datos
    async obtenerMesesConDatos() {
        const datos = await this.obtenerTodosLosDatos();
        const meses = Object.keys(datos).filter(clave => 
            clave.startsWith(this.claveBase)
        ).map(clave => clave.replace(this.claveBase, ''));
        
        return meses.sort();
    }

    // Guardar registro
    async guardarRegistro(datosRegistro) {
        const claveMes = this.obtenerClaveMes();
        const todosLosDatos = await this.obtenerTodosLosDatos();
        
        // Inicializar array para el mes si no existe
        if (!todosLosDatos[claveMes]) {
            todosLosDatos[claveMes] = [];
        }
        
        // Agregar ID, timestamp y fecha automática
        const nuevoRegistro = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            fecha: new Date().toLocaleString('es-MX'),
            ...datosRegistro
        };
        
        todosLosDatos[claveMes].push(nuevoRegistro);
        
        // Guardar en JSONBin
        const exito = await this.guardarTodosLosDatos(todosLosDatos);
        
        if (exito) {
            return nuevoRegistro;
        } else {
            throw new Error('Error al guardar en JSONBin');
        }
    }

    // Obtener registros de un mes específico
    async obtenerRegistrosMes(claveMes = null) {
        const clave = claveMes || this.obtenerClaveMes();
        const datos = await this.obtenerTodosLosDatos();
        return datos[clave] || [];
    }

    // Obtener TODOS los registros
    async obtenerTodosLosRegistros() {
        const meses = await this.obtenerMesesConDatos();
        let todosLosRegistros = [];
        
        for (const mes of meses) {
            const registrosMes = await this.obtenerRegistrosMes(this.claveBase + mes);
            todosLosRegistros = todosLosRegistros.concat(registrosMes);
        }
        
        return todosLosRegistros;
    }

    // Verificar y crear nuevo mes si es necesario
    async verificarNuevoMes() {
        const ultimaVerificacion = localStorage.getItem('ultima_verificacion_mes_pf');
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        if (!ultimaVerificacion || new Date(ultimaVerificacion) < primerDiaMes) {
            const claveMesActual = this.obtenerClaveMes();
            const datos = await this.obtenerTodosLosDatos();
            
            if (!datos[claveMesActual]) {
                datos[claveMesActual] = [];
                await this.guardarTodosLosDatos(datos);
            }
            
            localStorage.setItem('ultima_verificacion_mes_pf', hoy.toISOString());
        }
    }

    // Crear nuevo mes manualmente
    async crearNuevoMesManual() {
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        const claveProximoMes = this.obtenerClaveMes(proximoMes);
        
        const datos = await this.obtenerTodosLosDatos();
        
        if (!datos[claveProximoMes]) {
            datos[claveProximoMes] = [];
            const exito = await this.guardarTodosLosDatos(datos);
            return exito;
        }
        return false;
    }

    // Exportar datos a formato Excel (CSV)
    async exportarExcel(claveMes = null) {
        const clave = claveMes || this.obtenerClaveMes();
        const registros = await this.obtenerRegistrosMes(clave);
        
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

    // Eliminar todos los registros
    async limpiarRegistros() {
        const datos = {};
        const claveMesActual = this.obtenerClaveMes();
        datos[claveMesActual] = [];
        
        const exito = await this.guardarTodosLosDatos(datos);
        return exito;
    }
}

// Instancia global del sistema
const sistemaPF = new SistemaRegistroPF();

// =============================================
// 📝 MANEJO DEL FORMULARIO (Actualizado para async/await)
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('form');
    if (formulario) {
        formulario.addEventListener('submit', manejarEnvioFormulario);
    }
});

async function manejarEnvioFormulario(evento) {
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
        await sistemaPF.guardarRegistro(datos);
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
// 🗑️ FUNCIÓN PARA ELIMINAR DATOS (Actualizada)
// =============================================

async function limpiarRegistros() {
    if (confirm('¿ESTÁS SEGURO DE ELIMINAR TODOS LOS REGISTROS?\n\n🚫 ESTA ACCIÓN NO SE PUEDE DESHACER\n\nSe eliminarán todos los datos de todos los meses.')) {
        
        const meses = await sistemaPF.obtenerMesesConDatos();
        let totalRegistros = 0;
        
        // Contar registros totales
        for (const mes of meses) {
            const registros = await sistemaPF.obtenerRegistrosMes(sistemaPF.claveBase + mes);
            totalRegistros += registros.length;
        }
        
        if (totalRegistros === 0) {
            alert('No hay registros para eliminar.');
            return;
        }
        
        if (confirm(`⛔ ELIMINACIÓN DEFINITIVA\n\nSe eliminarán:\n• ${totalRegistros} registros\n• ${meses.length} meses de datos\n\n¿CONTINUAR?`)) {
            
            const exito = await sistemaPF.limpiarRegistros();
            
            if (exito) {
                alert(`✅ Eliminación completada:\n\n🗑️ ${totalRegistros} registros eliminados\n📅 ${meses.length} meses limpiados`);
                
                // Recargar si está en hoja de cálculo
                if (window.location.pathname.includes('hoja-calculo')) {
                    location.reload();
                }
            } else {
                alert('❌ Error al eliminar los registros');
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

async function exportarExcel() {
    await sistemaPF.exportarExcel();
}

async function crearNuevoMes() {
    if (await sistemaPF.crearNuevoMesManual()) {
        alert('¡Nuevo mes creado exitosamente!');
        if (window.location.pathname.includes('hoja-calculo')) {
            location.reload();
        }
    } else {
        alert('El mes siguiente ya existe o no se pudo crear.');
    }
}