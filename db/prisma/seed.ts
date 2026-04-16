// Seed de datos iniciales para desarrollo
// Ejecutar con: pnpm --filter @base2/db seed

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  const empresa = await prisma.empresa.upsert({
    where: { cuit: '30-99999999-9' },
    update: {},
    create: {
      nombre: 'DDD Demo SRL',
      razonSocial: 'DDD Demo SRL',
      cuit: '30-99999999-9',
      email: 'admin@ddddemo.ar',
      telefono: '+54 11 5555-1234',
      timezone: 'America/Argentina/Buenos_Aires',
    },
  });

  const delegacion = await prisma.delegacion.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'CABA' } },
    update: {},
    create: {
      empresaId: empresa.id,
      codigo: 'CABA',
      nombre: 'Sede Central CABA',
      direccion: 'Av. Corrientes 1234',
      localidad: 'CABA',
      provincia: 'Buenos Aires',
      lat: -34.6037,
      lng: -58.3816,
    },
  });

  const lineaDDD = await prisma.lineaNegocio.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'DDD' } },
    update: {},
    create: {
      empresaId: empresa.id,
      codigo: 'DDD',
      nombre: 'Control de Plagas (DDD)',
      descripcion: 'Desinfeccion, desinsectacion y desratizacion',
      requiereDirectorTecnico: true,
      color: '#16A34A',
      icono: 'bug',
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  let empleadoAdmin = await prisma.empleado.findFirst({
    where: { empresaId: empresa.id, email: 'admin@ddddemo.ar' },
  });
  if (!empleadoAdmin) {
    empleadoAdmin = await prisma.empleado.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Admin',
        apellidos: 'Demo',
        email: 'admin@ddddemo.ar',
        esTecnico: false,
        activo: true,
      },
    });
  }

  await prisma.usuario.upsert({
    where: { empresaId_username: { empresaId: empresa.id, username: 'admin' } },
    update: {},
    create: {
      empresaId: empresa.id,
      empleadoId: empleadoAdmin.id,
      username: 'admin',
      email: 'admin@ddddemo.ar',
      passwordHash,
      tipo: 'admin',
    },
  });

  let empleadoTec = await prisma.empleado.findFirst({
    where: { empresaId: empresa.id, email: 'juan@ddddemo.ar' },
  });
  if (!empleadoTec) {
    empleadoTec = await prisma.empleado.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Juan',
        apellidos: 'Tecnico',
        email: 'juan@ddddemo.ar',
        esTecnico: true,
        carnePlagasNumero: 'AR-00001',
        carnePlagasTipo: 'aplicador',
        carnePlagasVencimiento: new Date('2027-12-31'),
        activo: true,
      },
    });
  }

  await prisma.usuario.upsert({
    where: { empresaId_username: { empresaId: empresa.id, username: 'juan' } },
    update: {},
    create: {
      empresaId: empresa.id,
      empleadoId: empleadoTec.id,
      username: 'juan',
      email: 'juan@ddddemo.ar',
      passwordHash,
      tipo: 'tecnico',
      usaOffline: true,
    },
  });

  // Tipos de punto de control DDD
  const tipoCebadero = await prisma.tipoPuntoControl.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'CEB-ROD' } },
    update: {},
    create: {
      empresaId: empresa.id,
      lineaNegocioId: lineaDDD.id,
      codigo: 'CEB-ROD',
      nombre: 'Cebadero rodenticida',
      prefijoCodigo: 'CR-',
      consumoDelCebo: true,
      seReponeElCebo: true,
      umbralCritico: 80,
      umbralSeguridad: 50,
      diasMaxCambioConsumible: 60,
      color: '#EF4444',
      icono: 'rat',
    },
  });

  const tipoTrampa = await prisma.tipoPuntoControl.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'TRAMP-AD' } },
    update: {},
    create: {
      empresaId: empresa.id,
      lineaNegocioId: lineaDDD.id,
      codigo: 'TRAMP-AD',
      nombre: 'Trampa adhesiva insectos',
      prefijoCodigo: 'TA-',
      color: '#F59E0B',
      icono: 'bug',
    },
  });

  const tipoUV = await prisma.tipoPuntoControl.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'LAMP-UV' } },
    update: {},
    create: {
      empresaId: empresa.id,
      lineaNegocioId: lineaDDD.id,
      codigo: 'LAMP-UV',
      nombre: 'Lampara UV electrocutora',
      prefijoCodigo: 'UV-',
      color: '#8B5CF6',
      icono: 'zap',
    },
  });

  // Preguntas de revision (checklist dinamico) por tipo de PC
  const preguntasCebadero = [
    { codigo: 'CONSUMO', texto: 'Porcentaje de consumo del cebo', tipo: 'numerico', graf: true, orden: 1, ppal: true },
    { codigo: 'ESTADO', texto: 'Estado del dispositivo', tipo: 'opcion_unica', orden: 2, opciones: ['bueno', 'regular', 'malo'] },
    { codigo: 'REPUESTO', texto: 'Se repone el cebo?', tipo: 'boolean', orden: 3 },
    { codigo: 'ACCESIBLE', texto: 'El punto es accesible?', tipo: 'boolean', orden: 4, valorPorDefecto: 'true' },
    { codigo: 'INDICIOS', texto: 'Indicios de roedores (heces, mordidas, pelos)', tipo: 'opcion_multiple', orden: 5, opciones: ['heces', 'mordidas', 'pelos', 'ninguno'] },
    { codigo: 'OBS', texto: 'Observaciones', tipo: 'texto', orden: 6 },
  ];

  const preguntasTrampa = [
    { codigo: 'CAPTURA', texto: 'Cantidad de capturas', tipo: 'numerico', graf: true, orden: 1, ppal: true },
    { codigo: 'ESPECIES', texto: 'Especies capturadas', tipo: 'opcion_multiple', orden: 2, opciones: ['moscas', 'cucarachas', 'mosquitos', 'polillas', 'otros'] },
    { codigo: 'SUST', texto: 'Se sustituye el placa adhesiva?', tipo: 'boolean', orden: 3 },
    { codigo: 'OBS', texto: 'Observaciones', tipo: 'texto', orden: 4 },
  ];

  const preguntasUV = [
    { codigo: 'FUNC', texto: 'Lampara funcionando?', tipo: 'boolean', orden: 1, ppal: true },
    { codigo: 'PLACA', texto: 'Se sustituye la placa adhesiva?', tipo: 'boolean', orden: 2 },
    { codigo: 'TUBO', texto: 'Se sustituye el tubo UV?', tipo: 'boolean', orden: 3 },
    { codigo: 'OBS', texto: 'Observaciones', tipo: 'texto', orden: 4 },
  ];

  const seedPreguntas = async (tipoPcId: string, preguntas: any[]) => {
    for (const p of preguntas) {
      await prisma.preguntaRevision.upsert({
        where: { tipoPuntoControlId_codigo: { tipoPuntoControlId: tipoPcId, codigo: p.codigo } },
        update: {},
        create: {
          empresaId: empresa.id,
          tipoPuntoControlId: tipoPcId,
          codigo: p.codigo,
          textoPregunta: p.texto,
          tipoRespuesta: p.tipo as any,
          orden: p.orden,
          esPrincipal: p.ppal ?? false,
          esGraficable: p.graf ?? false,
          respuestaMultiple: p.tipo === 'opcion_multiple',
          valorPorDefecto: p.valorPorDefecto,
          opciones: p.opciones ? (p.opciones as any) : undefined,
        },
      });
    }
  };

  await seedPreguntas(tipoCebadero.id, preguntasCebadero);
  await seedPreguntas(tipoTrampa.id, preguntasTrampa);
  await seedPreguntas(tipoUV.id, preguntasUV);

  // Catalogo de productos biocidas
  const productosData = [
    {
      codigo: 'BIO-BRODI',
      nombre: 'Brodifacoum 0.005%',
      nombreComercial: 'RataKill',
      fabricante: 'DemoChem',
      registro: 'SENASA-AR-12345',
      materiaActiva: 'Brodifacoum',
      porcentajeMateriaActiva: 0.005,
      metodoAplicacion: 'Cebo en bloque',
      toxicidad: 'Categoria II',
      unidadMedida: 'kg',
    },
    {
      codigo: 'BIO-CIPER',
      nombre: 'Cipermetrina 25%',
      nombreComercial: 'InsecTec',
      fabricante: 'DemoChem',
      registro: 'SENASA-AR-67890',
      materiaActiva: 'Cipermetrina',
      porcentajeMateriaActiva: 25,
      metodoAplicacion: 'Pulverizacion',
      toxicidad: 'Categoria III',
      unidadMedida: 'L',
      dosificacion: '10 ml / L agua',
    },
    {
      codigo: 'BIO-DELTA',
      nombre: 'Deltametrina 2.5%',
      nombreComercial: 'DeltaPro',
      fabricante: 'DemoChem',
      registro: 'SENASA-AR-54321',
      materiaActiva: 'Deltametrina',
      porcentajeMateriaActiva: 2.5,
      metodoAplicacion: 'Pulverizacion / Termonebulizacion',
      toxicidad: 'Categoria III',
      unidadMedida: 'L',
      dosificacion: '20 ml / L agua',
    },
    {
      codigo: 'BIO-AMONIO',
      nombre: 'Amonio cuaternario',
      nombreComercial: 'Sanitizer-Q',
      fabricante: 'DemoChem',
      registro: 'ANMAT-AR-98765',
      materiaActiva: 'Cloruro de benzalconio',
      porcentajeMateriaActiva: 10,
      metodoAplicacion: 'Pulverizacion / Mopa',
      toxicidad: 'Categoria IV',
      unidadMedida: 'L',
      dosificacion: '50 ml / 10 L agua',
    },
  ];

  for (const p of productosData) {
    await prisma.producto.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: p.codigo } },
      update: {},
      create: {
        empresaId: empresa.id,
        lineaNegocioId: lineaDDD.id,
        esBiocida: true,
        ...p,
      },
    });
  }

  // Cliente y sede de prueba
  const cliente = await prisma.cliente.upsert({
    where: { empresaId_numero: { empresaId: empresa.id, numero: '0001' } },
    update: {},
    create: {
      empresaId: empresa.id,
      delegacionId: delegacion.id,
      numero: '0001',
      razonSocial: 'Restaurante La Parrilla SA',
      cuit: '30-12345678-9',
      email: 'admin@laparrilla.ar',
      telefono: '+54 11 4444-0000',
      direccion: 'Av. Santa Fe 2500',
      localidad: 'CABA',
      provincia: 'Buenos Aires',
      tipo: 'empresa',
    },
  });

  const sede = await prisma.sede.upsert({
    where: {
      empresaId_clienteId_numero: {
        empresaId: empresa.id,
        clienteId: cliente.id,
        numero: '01',
      },
    },
    update: {},
    create: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      numero: '01',
      nombre: 'La Parrilla - Sede Palermo',
      direccion: 'Av. Santa Fe 2500',
      localidad: 'CABA',
      provincia: 'Buenos Aires',
      lat: -34.5885,
      lng: -58.4031,
      m2: 250,
      personaContacto: 'Martin Perez',
      telefonoContacto: '+54 11 4444-0001',
    },
  });

  // Puntos de control de ejemplo en la sede
  const puntosData = [
    { codigo: 'CR-001', tipo: tipoCebadero.id, x: 120, y: 80, detalle: 'Deposito - pared norte' },
    { codigo: 'CR-002', tipo: tipoCebadero.id, x: 250, y: 150, detalle: 'Cocina - detras de heladera' },
    { codigo: 'CR-003', tipo: tipoCebadero.id, x: 410, y: 200, detalle: 'Patio trasero - esquina' },
    { codigo: 'TA-001', tipo: tipoTrampa.id, x: 180, y: 120, detalle: 'Zona de preparacion' },
    { codigo: 'TA-002', tipo: tipoTrampa.id, x: 350, y: 180, detalle: 'Sector basura' },
    { codigo: 'UV-001', tipo: tipoUV.id, x: 220, y: 60, detalle: 'Entrada cocina' },
  ];

  for (const p of puntosData) {
    await prisma.puntoControl.upsert({
      where: {
        empresaId_sedeId_codigo: { empresaId: empresa.id, sedeId: sede.id, codigo: p.codigo },
      },
      update: {},
      create: {
        empresaId: empresa.id,
        sedeId: sede.id,
        tipoPuntoControlId: p.tipo,
        codigo: p.codigo,
        x: p.x,
        y: p.y,
        detalleUbicacion: p.detalle,
      },
    });
  }

  // OT de prueba para hoy asignada al tecnico juan
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let odt = await prisma.ordenTrabajo.findFirst({
    where: { empresaId: empresa.id, numero: 'OT-0001' },
  });
  if (!odt) {
    odt = await prisma.ordenTrabajo.create({
      data: {
        empresaId: empresa.id,
        delegacionId: delegacion.id,
        clienteId: cliente.id,
        sedeId: sede.id,
        lineaNegocioId: lineaDDD.id,
        numero: 'OT-0001',
        estado: 'asignada',
        estadoAsignacion: 'asignada',
        esDesratizacion: true,
        esDesinsectacion: true,
        fechaBloqueo: hoy,
        horaInicioBloqueo: '09:00',
        horaFinBloqueo: '11:00',
      },
    });

    await prisma.ordenTrabajoEmpleado.create({
      data: { odtId: odt.id, empleadoId: empleadoTec.id, esPrincipal: true },
    });
  }

  console.log('Seed OK.');
  console.log('Login:');
  console.log('  empresaCuit: 30-99999999-9');
  console.log('  username: admin / juan');
  console.log('  password: admin123');
  console.log(`OT demo: ${odt.numero} (hoy, asignada a juan)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
