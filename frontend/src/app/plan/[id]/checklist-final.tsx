const REQUIRED_DOCUMENTS = [
  'Cédula y papeleta de votación',
  'Certificado de ingresos o roles de pago de los últimos 3 meses',
  'Certificado bancario de ahorro para la entrada',
  'Promesa de compraventa del inmueble',
];

export function ChecklistFinal(): JSX.Element {
  return (
    <section className="mt-6 rounded-xl bg-surface p-6" aria-label="Checklist para el banco">
      <h2 className="text-xl font-semibold">Ya calificas — esto necesitas llevar al banco</h2>
      <ul className="mt-4 list-disc pl-6">
        {REQUIRED_DOCUMENTS.map((document) => (
          <li key={document}>{document}</li>
        ))}
      </ul>
    </section>
  );
}
