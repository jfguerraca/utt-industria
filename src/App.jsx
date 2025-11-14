import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, updateDoc, getDoc, getDocs, setLogLevel } from 'firebase/firestore';

// --- CONFIGURACIÓN GLOBAL DE FIREBASE (ACTUALIZADA POR EL USUARIO) ---
const appId = 'utt-industrial-monitor';
const firebaseConfig = {
    apiKey: "AIzaSyAvym-YOj79nDdM8D9VCDNmCtg3YP2_huw",
    authDomain: "utt-industrial-monitor.firebaseapp.com",
    projectId: "utt-industrial-monitor",
    storageBucket: "utt-industrial-monitor.firebasestorage.app",
    messagingSenderId: "502532134151",
    appId: "1:502532134151:web:0480ad315feeac96da61a2"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Constantes para la aplicación
const PROFESOR_ID = '99999';
const ROLES = ['Operador A', 'Operador B', 'Supervisor'];
// Colores actualizados para combinar con la identidad visual de la UTT (Esmeralda/Burdeos)
const EQUIPOS = [
  { name: 'Esmeralda', color: 'bg-emerald-600' },
  { name: 'Burdeos', color: 'bg-red-800' },
  { name: 'Azul Zafiro', color: 'bg-blue-700' },
  { name: 'Amarillo Sol', color: 'bg-amber-500' },
  { name: 'Púrpura Profundo', color: 'bg-purple-900' },
];

// Lista de alumnos proporcionada por el usuario
const STUDENT_LIST = {
    '22010183': 'ALVAREZ NANGUSE EDGAR ALEJANDRO',
    '22010160': 'AVILA QUEZADA DAYANA BERENICE',
    '22010138': 'BEJARANO JUAREZ DANIEL',
    '21030190': 'CAMPOS CONTRERAS BIANCA REBECA',
    '22010146': 'CARLOS OYERVIDES LILIANA',
    '22010145': 'DE LEON GARCIA DANNA KAREN',
    '21030204': 'ESCOBEDO ROCHA ARELY YADIRA',
    '22010125': 'ESCOBEDO SIFUENTES DESIREE',
    '22010055': 'ESPITIA TREJO GENESIS ALELI',
    '22010189': 'GARCIA DEL TORO ALAN ALEXANDER',
    '22010192': 'GUTIERREZ GODINA KENYA FERNANDA',
    '22010108': 'JARAMILLO VAZQUEZ ARIEL ELIZABETH',
    '21010117': 'JUAREZ MATA JAIME',
    '22020183': 'LARA IBARRA ELVER ALAN',
    '22010128': 'MARTINEZ FRAGA JESUS MANUEL',
    '22010156': 'MARTINEZ LAVENANT XIMENA',
    '22010237': 'MELENDREZ LANDEROS MICHELLE IDALY',
    '22010134': 'MONTOYA MARTINEZ MIGUEL ANGEL',
    '20040088': 'NARVAEZ JUAREZ LEOBARDO HUMBERTO',
    '21010112': 'PALACIOS HERNANDEZ LESLIE IVETH',
    '21170168': 'REYES MONSIVAIS ANGEL DAVID',
    '20170007': 'REYNOSO MALDONADO LUIS ALBERTO',
    '21170183': 'RIOS ALBA NICOLAS',
    '22010218': 'SALAZAR HERNANDEZ GERARDO EMANUEL',
    '22010096': 'SEGURA TORRES JESUS ALEJANDRO',
    '22010250': 'VILLEGAS VEGA MIGUEL ANGEL',
};

// --- FUNCIONES UTILITARIAS ---

/**
 * Genera un color de equipo aleatorio.
 */
const getRandomEquipo = () => EQUIPOS[Math.floor(Math.random() * EQUIPOS.length)];

/**
 * Genera un rol aleatorio.
 */
const getRandomRole = () => ROLES[Math.floor(Math.random() * ROLES.length)];

/**
 * Asigna un nombre basado en la matrícula proporcionada o un nombre de mock.
 * @param {string} matricula
 * @returns {string} Nombre completo.
 */
const getMockNombre = (matricula) => {
    if (matricula === PROFESOR_ID) return 'Profesor/Coordinador G';
    // Buscar en la lista de alumnos proporcionada
    const foundName = STUDENT_LIST[matricula];
    if (foundName) return foundName;

    // Fallback a nombre de mock si la matrícula no está en la lista
    return `Usuario Invitado (${matricula})`;
};

// --- COMPONENTES DE VISTA ---

/**
 * Componente para mostrar mensajes modales (reemplaza alert()).
 */
const Modal = ({ title, message, onClose }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all duration-300 scale-100">
            <h3 className="text-xl font-bold text-emerald-700 mb-3">{title}</h3>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
                onClick={onClose}
                className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg shadow hover:bg-emerald-700 transition duration-150"
            >
                Entendido
            </button>
        </div>
    </div>
);


/**
 * 1. Pág de Login
 */
const LoginScreen = ({ setView, setMatricula, setModal, isLoading }) => {
    const [inputMatricula, setInputMatricula] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        const cleanedMatricula = inputMatricula.trim();
        if (!cleanedMatricula) {
            setModal({ title: "Error de Acceso", message: "Por favor, introduce tu Matrícula." });
            return;
        }
        setMatricula(cleanedMatricula);
        if (cleanedMatricula === PROFESOR_ID) {
            setView('profesor');
        } else {
            setView('alumno');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                {/* Logo de la UTT */}
                <img
                    src="https://utt.edu.mx/formatos/LOGOS(PNG)/UTTcompletoverticalRGB.png"
                    alt="Logo Universidad Tecnológica de Torreón"
                    className="mx-auto mb-8 h-16 w-auto"
                    // Fallback usando placeholder en caso de error
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x64/047857/ffffff?text=UTT" }}
                />
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acceso a Monitoreo</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="matricula" className="block text-sm font-medium text-gray-700">Matrícula</label>
                        <input
                            id="matricula"
                            type="text"
                            value={inputMatricula}
                            onChange={(e) => setInputMatricula(e.target.value)} // Permite espacios iniciales/finales que se limpian en handleLogin
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 transition duration-150"
                            placeholder="Ej. 12345 o 99999 (Profesor)"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Conectando...' : 'Acceder'}
                    </button>
                </form>
            </div>
        </div>
    );
};

/**
 * 2. Pág de Alumno (Operador/Supervisor)
 */
const AlumnoScreen = ({ matricula, db, userId, setModal, setView }) => {
    const [alumnoData, setAlumnoData] = useState(null);
    const [isSending, setIsSending] = useState(false);

    // Usar la matrícula como identificador único para el documento
    const docPath = `artifacts/${appId}/public/data/alumnos_conectados/${matricula}`;

    // Función para obtener los datos del alumno (Lectura a Demanda)
    const fetchAlumnoData = useCallback(async () => {
        if (!db || !matricula) return;
        try {
            const docSnap = await getDoc(doc(db, docPath));
            if (docSnap.exists()) {
                setAlumnoData(docSnap.data());
            }
        } catch (error) {
            console.error("Error al obtener datos del alumno:", error);
            // No mostramos modal de error aquí, ya que podría ocurrir si el documento aún no existe
        }
    }, [db, matricula, docPath]);


    // 1. Inicializa el documento del alumno al cargar (o lo actualiza como conectado)
    const initializeAlumno = useCallback(async () => {
        if (!db || !matricula) return;

        try {
            const alumnoRef = doc(db, docPath);
            const randomEquipo = getRandomEquipo();

            // Datos a establecer/actualizar
            const updateData = {
                matricula: matricula,
                nombreCompleto: getMockNombre(matricula),
                rol: getRandomRole(),
                equipo: randomEquipo.name,
                conectado: true, // Establece como conectado al iniciar sesión
                // Si ya existe, estos campos se mantienen por el merge:true
                userId: userId,
                colorTailwind: randomEquipo.color,
                // Inicializa ultimaSenal solo si es un documento nuevo
                ultimaSenal: null,
            };

            await setDoc(alumnoRef, updateData, { merge: true });

            // Una vez inicializado/conectado, leemos los datos actualizados
            await fetchAlumnoData();

        } catch (error) {
            console.error("Error al inicializar el alumno:", error);
            setModal({ title: "Error de Conexión", message: "No se pudo inicializar la conexión con Firestore." });
        }
    }, [db, matricula, userId, docPath, setModal, fetchAlumnoData]);

    useEffect(() => {
        initializeAlumno();
    }, [initializeAlumno]);

    // 2. [ELIMINADO] El listener de tiempo real (onSnapshot) se eliminó
    // para evitar el error de permisos/índice. El alumno debe interactuar
    // para ver los cambios del profesor (Opción 1).
    // Sin embargo, si el profesor hace un cambio, el 'onSnapshot' de la pantalla
    // del profesor sigue funcionando.

    // 3. Función para enviar la señal (y actualizar datos)
    const mandarSenal = async () => {
        if (!db || !alumnoData) return;
        setIsSending(true);
        try {
            const alumnoRef = doc(db, docPath);
            await updateDoc(alumnoRef, {
                ultimaSenal: Date.now(),
            });
            // Después de la escritura exitosa, obligamos a la re-lectura para ver si el profesor
            // cambió algo (rol/equipo)
            await fetchAlumnoData();
            setModal({ title: "Señal Enviada", message: "La señal de proceso ha sido enviada al Coordinador. Los datos se han actualizado." });
        } catch (error) {
            console.error("Error al enviar la señal:", error);
            setModal({ title: "Error de Señal", message: "No se pudo enviar la señal al servidor." });
        } finally {
            setIsSending(false);
        }
    };

    // 4. Función para salir y poner el estado en INACTIVO
    const handleLogout = async () => {
        if (!db || !matricula) return;
        try {
            const alumnoRef = doc(db, docPath);
            // Primero intentamos actualizar el estado a desconectado
            await updateDoc(alumnoRef, {
                conectado: false,
            });

            // Desloguear de Firebase Auth (anónimo)
            const auth = getAuth(initializeApp(firebaseConfig));
            await signOut(auth);
            setView('login');
        } catch (error) {
            // Si falla la actualización (ej. documento no existe), al menos cerramos sesión.
            console.error("Error al salir y actualizar estado:", error);

            const auth = getAuth(initializeApp(firebaseConfig));
            await signOut(auth);
            setView('login');

            // Solo mostramos el modal si no pudimos cerrar sesión
            if (!db) {
                setModal({ title: "Error al Salir", message: "No se pudo cerrar la conexión, intenta de nuevo." });
            }
        }
    };

    if (!alumnoData) {
        return <div className="min-h-screen flex items-center justify-center text-gray-600">Cargando datos del alumno...</div>;
    }

    // El colorClass se lee directamente del campo colorTailwind del alumnoData
    const colorClass = alumnoData.colorTailwind || 'bg-gray-400';

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-gray-100">
            <div className="max-w-xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold text-emerald-700">Panel de Operador</h1>
                    <button
                        onClick={handleLogout}
                        className="flex items-center text-sm font-semibold text-red-800 hover:text-red-600 transition duration-150"
                    >
                        {/* Icono de salida */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Salir
                    </button>
                </div>

                <div className={`p-6 rounded-2xl shadow-xl mb-8 text-white ${colorClass}`}>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-light">Matrícula: <span className="font-medium">{alumnoData.matricula}</span></p>
                        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-black bg-opacity-20">
                            Equipo {alumnoData.equipo}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{alumnoData.nombreCompleto}</h2>
                    <p className="text-lg font-semibold border-t border-white border-opacity-30 pt-3 mt-3">Rol Asignado: {alumnoData.rol}</p>
                    <p className="text-xs mt-2 opacity-80">ID de Conexión: {alumnoData.userId}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xl">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Control de Proceso</h3>
                    <p className="text-gray-600 mb-6">Utiliza el botón para simular una señal de evento o necesidad de cambio al Coordinador (Profesor).</p>
                    <p className="text-xs text-gray-400 mb-3 text-center">
                        *Los cambios de Rol o Equipo hechos por el profesor se verán reflejados después de enviar una señal.
                    </p>
                    <button
                        onClick={mandarSenal}
                        disabled={isSending}
                        className="w-full py-4 text-lg font-bold text-white bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/50 hover:bg-emerald-700 transition duration-150 disabled:bg-gray-400 disabled:shadow-none"
                    >
                        {isSending ? 'Enviando...' : 'MANDAR SEÑAL Y ACTUALIZAR DATOS'}
                    </button>

                    {alumnoData.ultimaSenal && (
                        <p className="text-sm text-gray-500 mt-4 text-center">
                            Última Señal: {new Date(alumnoData.ultimaSenal).toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * 3. Pág de Profesor (Coordinador)
 */
const ProfesorScreen = ({ db, userId, setModal, matricula, setView }) => {
    const [alumnos, setAlumnos] = useState([]);
    const [showAll, setShowAll] = useState(false); // Estado para mostrar todos o solo conectados

    const collectionPath = `artifacts/${appId}/public/data/alumnos_conectados`;
    const REFRESH_INTERVAL = 10000; // 10 segundos de intervalo de refresco (polling)

    // Función para obtener y procesar los datos (usada por polling)
    const fetchAndProcessAlumnos = useCallback(async () => {
        if (!db) return;
        try {
            // Leemos TODA la colección con una lectura única (getDocs)
            const snapshot = await getDocs(query(collection(db, collectionPath)));

            let alumnosList = snapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id }))
                .filter(alumno => alumno.matricula !== matricula); // Ocultar el propio documento del profesor

            // FILTRADO EN CLIENTE
            if (!showAll) {
                alumnosList = alumnosList.filter(alumno => alumno.conectado);
            }

            // Ordenar por última señal (más reciente primero)
            alumnosList.sort((a, b) => (b.ultimaSenal || 0) - (a.ultimaSenal || 0));

            setAlumnos(alumnosList);
        } catch (error) {
            console.error("Error al obtener la colección de alumnos (polling):", error);
            // Si el error es Quota Exceeded, el backoff de Firebase se encarga de esperar.
            // No mostramos modal de error constante para no molestar.
        }
    }, [db, collectionPath, matricula, showAll]);


    // Polling de datos (reemplaza onSnapshot para ahorrar cuota)
    useEffect(() => {
        if (!db) return;

        // 1. Ejecutar inmediatamente al cargar
        fetchAndProcessAlumnos();

        // 2. Establecer el intervalo de refresco
        const intervalId = setInterval(fetchAndProcessAlumnos, REFRESH_INTERVAL);

        // 3. Limpiar el intervalo al desmontar el componente
        return () => clearInterval(intervalId);
    }, [db, fetchAndProcessAlumnos]);

    // Función para cambiar Rol o Equipo
    const updateAlumno = async (alumnoId, field, value) => {
        if (!db) return;
        try {
            // Utilizamos alumnoId (que es la matrícula) para referenciar el documento
            const alumnoRef = doc(db, collectionPath, alumnoId);
            const updateData = {};

            if (field === 'equipo') {
                updateData[field] = value;
                // También actualiza la clase de color para evitar buscarla en cada render
                const colorClass = EQUIPOS.find(e => e.name === value)?.color || 'bg-gray-400';
                updateData.colorTailwind = colorClass;
            } else if (field === 'rol') {
                updateData[field] = value;
            }

            await updateDoc(alumnoRef, updateData);
            setModal({ title: "Proceso Actualizado", message: `Se actualizó el ${field} del alumno con éxito.` });

            // Forzar una actualización inmediata de la vista del profesor después de un cambio
            fetchAndProcessAlumnos();

        } catch (error) {
            console.error("Error al actualizar alumno:", error);
            setModal({ title: "Error de Actualización", message: "No se pudo actualizar el estado del alumno." });
        }
    };

    // Función para salir del profesor (solo regresa al login)
    const handleProfessorLogout = () => {
        setView('login');
    };

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold text-red-800">Panel de Coordinación y Monitoreo</h1>
                    <button
                        onClick={handleProfessorLogout}
                        className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900 transition duration-150 border px-3 py-1 rounded-lg bg-white shadow-sm"
                    >
                        {/* Icono de salida */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Salir
                    </button>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-600">
                        {showAll ? 'Alumnos Registrados' : 'Alumnos CONECTADOS'}:
                        <span className="font-bold text-lg ml-1">{alumnos.length}</span>
                    </p>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`text-sm font-medium py-1 px-3 rounded-full transition duration-150 ${
                            showAll
                                ? 'bg-red-800 text-white hover:bg-red-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        {showAll ? 'Mostrar Solo Conectados' : 'Mostrar Todos (Inactivos)'}
                    </button>
                </div>


                <div className="space-y-4">
                    {alumnos.map(alumno => {
                        const colorClass = alumno.colorTailwind || 'bg-gray-400';
                        const lastSignalTime = alumno.ultimaSenal ? new Date(alumno.ultimaSenal).toLocaleTimeString() : 'N/A';

                        // Determinar si la señal es reciente (ej. últimos 30 segundos)
                        const isRecent = alumno.ultimaSenal && (Date.now() - alumno.ultimaSenal) < 30000 && alumno.conectado;
                        const signalRing = isRecent ? 'ring-4 ring-red-500/50' : 'ring-1 ring-gray-300';

                        // Estado de Conexión
                        const connectionState = alumno.conectado
                            ? { text: 'CONECTADO', color: 'text-emerald-600', dot: 'bg-emerald-500' }
                            : { text: 'INACTIVO', color: 'text-gray-500', dot: 'bg-gray-400' };

                        // Si está inactivo, reducimos la opacidad visualmente
                        const opacityClass = alumno.conectado ? '' : 'opacity-60';

                        return (
                            <div key={alumno.matricula} className={`bg-white p-4 rounded-xl shadow-lg border-l-8 ${colorClass.replace('bg-', 'border-')} ${signalRing} transition-all duration-300 ${opacityClass}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-gray-800">
                                        <p className="text-lg font-bold">{alumno.nombreCompleto} ({alumno.matricula})</p>
                                        <p className="text-sm text-gray-500">ID de Conexión: <span className="text-xs">{alumno.userId}</span></p>
                                    </div>
                                    <div className={`p-2 rounded-lg text-white font-semibold text-sm ${colorClass}`}>
                                        {alumno.equipo}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500">ESTADO</p>
                                        <div className="flex items-center mt-1">
                                            <span className={`w-3 h-3 rounded-full mr-2 ${connectionState.dot}`}></span>
                                            <p className={`text-base font-bold ${connectionState.color}`}>{connectionState.text}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500">ROL ACTUAL</p>
                                        <p className="text-base font-bold text-gray-900">{alumno.rol}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-500">ÚLTIMA SEÑAL</p>
                                        <p className={`text-base font-bold ${isRecent ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{isRecent ? '¡SEÑAL RECIENTE!' : lastSignalTime}</p>
                                    </div>
                                </div>

                                {/* Controles de Cambio (Simulación de Intervención) */}
                                <div className="mt-4 border-t pt-4 space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Intervención de Proceso (Cambio de Rol/Equipo)</p>

                                    {/* Selector de Rol */}
                                    <select
                                        value={alumno.rol}
                                        onChange={(e) => updateAlumno(alumno.matricula, 'rol', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="" disabled>Cambiar Rol</option>
                                        {ROLES.map(rol => (
                                            <option key={rol} value={rol}>{rol}</option>
                                        ))}
                                    </select>

                                    {/* Selector de Equipo */}
                                    <select
                                        value={alumno.equipo}
                                        onChange={(e) => updateAlumno(alumno.matricula, 'equipo', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="" disabled>Cambiar Equipo</option>
                                        {EQUIPOS.map(equipo => (
                                            <option key={equipo.name} value={equipo.name}>{equipo.name} ({equipo.name})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                    {alumnos.length === 0 && !showAll && (
                        <div className="text-center p-10 bg-white rounded-xl shadow-lg text-gray-500">
                            No hay alumnos CONECTADOS actualmente.
                        </div>
                    )}
                     {alumnos.length === 0 && showAll && (
                        <div className="text-center p-10 bg-white rounded-xl shadow-lg text-gray-500">
                            No hay alumnos REGISTRADOS en la base de datos.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


/**
 * Componente Principal
 */
const App = () => {
    const [view, setView] = useState('login');
    const [matricula, setMatricula] = useState('');
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modal, setModal] = useState(null); // Para reemplazar alert()

    // 1. Inicialización de Firebase y Autenticación
    useEffect(() => {
        try {
            // Habilitar registro de debug para diagnosticar problemas de permisos.
            setLogLevel('debug');

            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const firestore = getFirestore(app);
            setDb(firestore);

            // Intentar autenticación con token personalizado o de forma anónima
            const authenticate = async () => {
                let success = false;
                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(auth, initialAuthToken);
                        success = true;
                    } catch (error) {
                        // El token personalizado falló (ej. auth/custom-token-mismatch).
                        // Se omite el error de CONSOLE_ERROR y se procede al login anónimo.
                        console.log("Fallo de custom token. Iniciando sesión anónima como fallback.");
                    }
                }

                // Si la autenticación con custom token falló o no se intentó, usamos la anónima.
                if (!success) {
                    try {
                        await signInAnonymously(auth);
                    } catch (error) {
                        console.error("Error de autenticación anónima:", error);
                    }
                }
            };

            authenticate();

            // Listener del estado de autenticación
            const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Esto debería ser raro después de la llamada a authenticate
                    console.log("Usuario no autenticado después del intento.");
                }
                setIsLoading(false);
            });

            return () => unsubscribeAuth();
        } catch (error) {
            console.error("Error al inicializar Firebase:", error);
            setModal({ title: "Error Fatal", message: "No se pudo conectar a Firebase. Revisa la configuración de tu entorno." });
            setIsLoading(false);
        }
    }, []);

    // 2. Renderizado condicional de la vista
    const renderView = () => {
        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <p className="text-lg text-emerald-600 font-semibold animate-pulse">Cargando sistema...</p>
                </div>
            );
        }

        switch (view) {
            case 'login':
                return <LoginScreen setView={setView} setMatricula={setMatricula} setModal={setModal} isLoading={isLoading} />;
            case 'alumno':
                // Requiere db y userId para operar
                if (!db || !userId) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: Base de datos no lista.</div>;
                // Se pasa setView al AlumnoScreen para permitir el Logout
                // IMPORTANTE: Ahora la AlumnoScreen usa la MATRICULA como doc ID
                return <AlumnoScreen matricula={matricula} db={db} userId={userId} setModal={setModal} setView={setView} />;
            case 'profesor':
                // Requiere db y userId para operar
                if (!db || !userId) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: Base de datos no lista.</div>;
                // Se pasa setView al ProfesorScreen para permitir el Logout
                return <ProfesorScreen matricula={matricula} db={db} userId={userId} setModal={setModal} setView={setView} />;
            default:
                return <LoginScreen setView={setView} setMatricula={setMatricula} setModal={setModal} isLoading={isLoading} />;
        }
    };

    return (
        <div className="font-sans antialiased bg-gray-100 min-h-screen">
            {/* Contenedor principal de la aplicación */}
            {renderView()}

            {/* Modal para mensajes del sistema */}
            {modal && <Modal title={modal.title} message={modal.message} onClose={() => setModal(null)} />}
        </div>
    );
};

export default App;