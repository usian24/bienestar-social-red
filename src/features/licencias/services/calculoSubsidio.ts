import { Licencia, TipoLicencia } from '@prisma/client';

export interface BalanceSubsidio {
  diasTotalesAnio: number;
  diasEmpleador: number;      // Días 1 al 20 asumidos por la Red
  diasSubsidiados: number;    // Día 21 en adelante (reembolso EsSalud)
  aplicaSubsidio: boolean;
  licenciasCronologicas: Licencia[];
}

export function calcularSubsidioAnual(licencias: Licencia[]): BalanceSubsidio {
  // 1. Filtrar solo licencias de tipo Enfermedad Común o Accidente
  const licenciasSalud = licencias
    .filter(l => l.tipoLicencia === 'ENFERMEDAD_COMUN' || l.tipoLicencia === 'ACCIDENTE_COMUN')
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

  let acumuladorDias = 0;
  let diasEmpleador = 0;
  let diasSubsidiados = 0;

  for (const lic of licenciasSalud) {
    const diasActuales = lic.diasOtorgados;

    if (acumuladorDias + diasActuales <= 20) {
      // Todo el bloque cae dentro de los primeros 20 días
      diasEmpleador += diasActuales;
    } else if (acumuladorDias < 20 && acumuladorDias + diasActuales > 20) {
      // Bloque mixto: parte la cubre la Red y parte pasa a EsSalud
      const restanteEmpleador = 20 - acumuladorDias;
      diasEmpleador += restanteEmpleador;
      diasSubsidiados += (diasActuales - restanteEmpleador);
    } else {
      // A partir del día 21 acumulado, todo es subsidio
      diasSubsidiados += diasActuales;
    }

    acumuladorDias += diasActuales;
  }

  return {
    diasTotalesAnio: acumuladorDias,
    diasEmpleador,
    diasSubsidiados,
    aplicaSubsidio: acumuladorDias > 20,
    licenciasCronologicas: licenciasSalud
  };
}

