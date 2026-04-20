import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../../prisma/prisma.service';

type BufferLike = Buffer;

@Injectable()
export class PartesService {
  constructor(private readonly prisma: PrismaService) {}

  async generarParteOdt(empresaId: string, odtId: string): Promise<BufferLike> {
    const odt = await this.prisma.ordenTrabajo.findFirst({
      where: { id: odtId, empresaId },
      include: {
        empresa: true,
        cliente: true,
        sede: true,
        lineaNegocio: true,
        empleados: { include: { empleado: true } },
        revisiones: {
          include: {
            puntoControl: { include: { tipo: true } },
            respuestas: { orderBy: { orden: 'asc' } },
            productos: { include: { producto: true } },
            fotos: true,
          },
          orderBy: { fecha: 'asc' },
        },
      },
    });
    if (!odt) throw new NotFoundException('OT no encontrada');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    await this.renderContenido(doc, odt);

    doc.end();
    return done;
  }

  private async renderContenido(doc: PDFKit.PDFDocument, odt: any) {
    const {
      empresa,
      cliente,
      sede,
      lineaNegocio,
      empleados,
      revisiones,
      numero,
      fechaBloqueo,
      horaInicioReal,
      horaFinReal,
      horaCierre,
      personaFirmante,
      dniFirmante,
      notaPublica,
      esDesinsectacion,
      esDesratizacion,
      esDesinfeccion,
      firmaUrl,
    } = odt;

    // Encabezado
    doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text('Parte de trabajo', { align: 'left' });
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`OT ${numero}`);
    doc.moveDown(0.3);

    // Bloque empresa / cliente
    doc.fillColor('#111827').fontSize(10);
    const colLeft = 40;
    const colRight = 310;
    const topY = doc.y;
    doc.font('Helvetica-Bold').text('Empresa prestadora', colLeft, topY);
    doc.font('Helvetica').text(`${empresa.razonSocial ?? empresa.nombre}`);
    doc.text(`CUIT: ${empresa.cuit}`);
    if (empresa.email) doc.text(empresa.email);
    if (empresa.telefono) doc.text(empresa.telefono);

    doc.font('Helvetica-Bold').text('Cliente', colRight, topY);
    doc.font('Helvetica').text(`${cliente.razonSocial}`, colRight);
    if (cliente.cuit) doc.text(`CUIT: ${cliente.cuit}`, colRight);
    if (cliente.email) doc.text(cliente.email, colRight);
    if (cliente.telefono) doc.text(cliente.telefono, colRight);

    doc.moveDown(1);

    // Bloque sede / linea negocio / flags
    const y2 = doc.y;
    doc.font('Helvetica-Bold').text('Sede', colLeft, y2);
    doc.font('Helvetica').text(`${sede.nombre}`);
    doc.text(`${sede.direccion ?? ''}`);
    if (sede.localidad) doc.text(`${sede.localidad}, ${sede.provincia ?? ''}`);

    doc.font('Helvetica-Bold').text('Servicio', colRight, y2);
    doc.font('Helvetica').text(lineaNegocio?.nombre ?? '—', colRight);
    const flags: string[] = [];
    if (esDesinsectacion) flags.push('Desinsectacion');
    if (esDesratizacion) flags.push('Desratizacion');
    if (esDesinfeccion) flags.push('Desinfeccion');
    if (flags.length > 0) doc.text(flags.join(' · '), colRight);

    doc.moveDown(1);

    // Fechas + tecnicos
    const principales = empleados.filter((e: any) => e.esPrincipal).map((e: any) => `${e.empleado.nombre} ${e.empleado.apellidos ?? ''}`);
    const otros = empleados.filter((e: any) => !e.esPrincipal).map((e: any) => `${e.empleado.nombre} ${e.empleado.apellidos ?? ''}`);
    const tecnicos = [...principales, ...otros].join(', ');

    doc.font('Helvetica-Bold').text('Programacion');
    doc.font('Helvetica').text(`Fecha: ${this.fmtFecha(fechaBloqueo)}`);
    if (horaInicioReal) doc.text(`Inicio real: ${this.fmtHora(horaInicioReal)}`);
    if (horaFinReal) doc.text(`Fin real: ${this.fmtHora(horaFinReal)}`);
    if (tecnicos) doc.text(`Tecnicos: ${tecnicos}`);

    doc.moveDown(1);

    // Puntos de control revisados
    doc.font('Helvetica-Bold').fontSize(12).text('Puntos de control revisados');
    doc.fontSize(10).font('Helvetica');

    if (!revisiones || revisiones.length === 0) {
      doc.fillColor('#6b7280').text('Sin revisiones registradas.').fillColor('#111827');
    } else {
      for (const r of revisiones) {
        this.ensureSpace(doc, 120);
        const pc = r.puntoControl;
        doc
          .font('Helvetica-Bold')
          .text(`${pc.codigo}  ·  ${pc.tipo?.nombre ?? ''}`, { continued: false });
        doc.font('Helvetica').fillColor('#4b5563').fontSize(9);
        if (pc.detalleUbicacion) doc.text(`Ubicacion: ${pc.detalleUbicacion}`);
        const tags: string[] = [];
        tags.push(`Estado: ${r.estado}`);
        if (r.estadoConservacion) tags.push(`Conservacion: ${r.estadoConservacion}`);
        if (r.hayIncidencia) tags.push('INCIDENCIA');
        if (r.inaccesible) tags.push('inaccesible');
        if (r.seCambiaElCebo) tags.push('cebo repuesto');
        doc.text(tags.join(' · '));

        // Respuestas
        if (r.respuestas?.length > 0) {
          for (const q of r.respuestas) {
            doc.text(`  · ${q.textoPregunta}: ${q.respuesta ?? '—'}`);
          }
        }

        // Productos aplicados
        if (r.productos?.length > 0) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text('  Productos aplicados:');
          doc.font('Helvetica').fillColor('#4b5563');
          for (const lp of r.productos) {
            const nombre = lp.producto?.nombre ?? lp.productoId;
            const reg = lp.producto?.registro ? ` (reg ${lp.producto.registro})` : '';
            const lote = lp.lote ? ` · lote ${lp.lote}` : '';
            const venc = lp.fechaCaducidad ? ` · vence ${this.fmtFecha(lp.fechaCaducidad)}` : '';
            doc.text(`    - ${nombre}${reg}: ${lp.cantidad} ${lp.unidadMedida ?? ''}${lote}${venc}`);
          }
        }

        if (r.observaciones) {
          doc.fillColor('#4b5563').font('Helvetica-Oblique').text(`  Obs: ${r.observaciones}`);
          doc.font('Helvetica');
        }

        doc.fillColor('#111827').fontSize(10).moveDown(0.5);
      }
    }

    // Observaciones generales
    if (notaPublica) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Nota al cliente');
      doc.font('Helvetica').text(notaPublica);
    }

    // Firma
    doc.moveDown(1.5);
    this.ensureSpace(doc, 150);
    doc.font('Helvetica-Bold').text('Firma del cliente');
    doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
    if (personaFirmante) doc.text(`Nombre: ${personaFirmante}`);
    if (dniFirmante) doc.text(`DNI: ${dniFirmante}`);
    if (horaCierre) doc.text(`Fecha/hora cierre: ${this.fmtDateTime(horaCierre)}`);

    if (firmaUrl) {
      try {
        const img = await this.fetchImageBuffer(firmaUrl);
        if (img) {
          doc.image(img, { width: 200, height: 80 });
        }
      } catch {
        doc.fillColor('#6b7280').text(`(firma disponible en ${firmaUrl})`);
      }
    }
    doc.fillColor('#111827');

    // Pie legal / libro de tratamientos
    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor('#6b7280')
      .text(
        `Documento generado por ${empresa.razonSocial ?? empresa.nombre} (CUIT ${empresa.cuit}). ` +
          'Registro asentado en el libro de tratamientos. ' +
          'Biocidas con registro SENASA/ANMAT. Ver detalle de productos arriba.',
      );
  }

  private async fetchImageBuffer(url: string): Promise<BufferLike | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } catch {
      return null;
    }
  }

  private ensureSpace(doc: PDFKit.PDFDocument, px: number) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - px) {
      doc.addPage();
    }
  }

  private fmtFecha(d?: Date | string | null) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private fmtHora(d?: Date | string | null) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  private fmtDateTime(d?: Date | string | null) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return (
      date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    );
  }
}
