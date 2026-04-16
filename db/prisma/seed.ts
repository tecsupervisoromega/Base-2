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
  const empleadoAdmin = await prisma.empleado.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Admin',
      apellidos: 'Demo',
      email: 'admin@ddddemo.ar',
      esTecnico: false,
      activo: true,
    },
  });

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

  const empleadoTec = await prisma.empleado.create({
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

  await prisma.usuario.create({
    data: {
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

  await prisma.tipoPuntoControl.upsert({
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

  await prisma.tipoPuntoControl.upsert({
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

  // Producto biocida demo
  await prisma.producto.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'BIO-BRODI' } },
    update: {},
    create: {
      empresaId: empresa.id,
      lineaNegocioId: lineaDDD.id,
      codigo: 'BIO-BRODI',
      nombre: 'Brodifacoum 0.005%',
      nombreComercial: 'RataKill',
      fabricante: 'DemoChem',
      esBiocida: true,
      registro: 'SENASA-AR-12345',
      materiaActiva: 'Brodifacoum',
      porcentajeMateriaActiva: 0.005,
      metodoAplicacion: 'Cebo en bloque',
      toxicidad: 'Categoria II',
      unidadMedida: 'kg',
    },
  });

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

  await prisma.sede.upsert({
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

  console.log('Seed OK. Login:');
  console.log('  empresaCuit: 30-99999999-9');
  console.log('  username: admin / juan');
  console.log('  password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
