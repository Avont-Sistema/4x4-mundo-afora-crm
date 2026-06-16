// Termo de Responsabilidade, Compromisso e Autorização de Uso de Imagem.
// Texto canônico padrão (editável em Configurações via kvStore). Os placeholders
// {EVENT_NAME} {EVENT_DATES} {EVENT_LOCATION} {SIGN_CITY} {SIGN_DATE} são
// preenchidos automaticamente a partir da expedição no momento da assinatura.

// Versione sempre que o texto padrão mudar (fica gravado no contrato assinado).
export const TERM_VERSION = '2026-06-1';

export const TERM_TITLE =
  'TERMO DE RESPONSABILIDADE, COMPROMISSO E AUTORIZAÇÃO DE USO DE IMAGEM';

export const DEFAULT_SIGN_CITY = 'Capão Alto/SC';

// Template padrão. Mantém os números das cláusulas (1 a 14) e o fecho.
export const DEFAULT_IMAGE_RIGHTS_TERM = `Ao me inscrever no evento {EVENT_NAME}, a ser realizado em {EVENT_DATES}{EVENT_LOCATION_SUFFIX}, DECLARO para todos os fins de direito que:

1. Participarei das atividades esportivas e de lazer previstas para as datas e locais mencionados, ciente de que se trata de um evento que envolve desafios físicos e emocionais. Declaro que eu e as demais pessoas citadas na minha inscrição, estamos em pleno gozo de saúde e não possuímos restrições para participar dessas atividades.

2. Assumo todos os riscos envolvidos, tanto para mim quanto para terceiros, isentando a Organização, seus colaboradores, patrocinadores e donos de estabelecimentos contratados de qualquer responsabilidade por danos materiais, morais ou físicos que possam ocorrer antes, durante ou após o evento. Reconheço que o veículo que utilizarei está em plenas condições de segurança e aptidão para atividades off-road. Também fui informado sobre as dificuldades do percurso e as normas de segurança, isento os instrutores e organizadores de qualquer responsabilidade civil ou criminal.

3. Reconheço e aceito que eventos dessa natureza são sujeitos a intempéries, como tempestades, chuvas torrenciais, neblina, estradas interrompidas, travessias impossibilitadas, panes mecânicas ou elétricas em veículos, e outros fatores que podem causar mudanças no roteiro e atrasos na programação. Estou ciente de que, caso o evento seja adiado devido a tais circunstâncias ou demais que impossibilitem a realização, a nova data será definida com base nas possibilidades disponíveis e na disponibilidade dos envolvidos.

4. Sou responsável por qualquer dano ocorrido no veículo, seja ele de minha propriedade ou não, assim como em acessórios e/ou equipamentos off-road utilizados durante o evento. A Organização e os demais participantes estão isentos de qualquer responsabilidade por danos que venham a ocorrer.

5. A organização fornecerá um rádio comunicador no início da expedição, sendo seu uso obrigatório para manter a segurança do comboio. Comprometo-me a devolver o equipamento em perfeito estado de conservação e funcionamento; caso contrário, me responsabilizo pelo pagamento de conserto ou reposição em caso de perda.

6. Em caso de defeito, pane ou imobilização do meu veículo, a Organização prestará auxílio no deslocamento até a estrada mais próxima, onde seja possível obter socorro mecânico ou guincho, cujo custo será de minha responsabilidade.

7. Estou ciente de que há um seguro aventura contratado em meu nome e dos participantes do meu veículo. Em caso de necessidade de atendimento médico, o atendimento será inicialmente realizado na rede pública. Havendo necessidade de recorrer à rede particular, devo seguir as normas estipuladas pelo seguro, solicitando e obedecendo às orientações fornecidas pelos Organizadores. Caso eu ou os participantes do meu veículo não sigamos esses procedimentos, isentamos a organização de qualquer responsabilidade por despesas médicas que venhamos a realizar.

8. Estou ciente de que NÃO É PERMITIDO o consumo de bebida alcoólica durante o trajeto pelos condutores e passageiros dos veículos. Comprometo-me a respeitar rigorosamente as normas de segurança e o Código Nacional de Trânsito, mantendo e dirigindo o meu veículo com prudência e dentro das melhores práticas de condução.

9. Protegerei e preservarei o meio ambiente, garantindo que o lixo seja mantido dentro do veículo e descartado adequadamente após o evento. Respeitarei os costumes, tradições e culturas das comunidades nas quais realizaremos eventos fora de estrada e os locais por onde transitaremos em comboio. Comprometo-me a não causar danos ambientais e assumo total responsabilidade por qualquer reparação necessária, tanto civil quanto criminal, em caso de danos.

10. Comprometo-me a ser pontual em todos os horários pré-estabelecidos da programação durante toda a expedição, reconhecendo a importância da pontualidade para a segurança e organização do evento.

11. Autorizo expressamente o uso de minha imagem e das imagens dos ocupantes do meu veículo, captadas durante o evento, para fins de divulgação em redes sociais e promoção de novos eventos, renunciando a qualquer remuneração ou indenização. Autorizo ainda que a Organização faça uso e tratamento de meus dados, imagens, vídeos e depoimentos de acordo com a Lei Geral de Proteção de Dados (LGPD) - Lei 13.709/18.

12. Estou ciente de que o pacote contratado cobre serviços de acompanhamento no roteiro e itens previamente especificados durante a contratação do evento. As demais despesas com alimentação, combustível, pedágios, taxas de entradas/ingressos nas propriedades particulares e/ou parques (não mencionados no pacote) são de minha responsabilidade.

13. Li, compreendi e aceito e me submeto integralmente a todos os termos de responsabilidade, compromisso e autorização de uso de imagem apresentados, isentando a 4x4 Mundo Afora, seus parceiros, patrocinadores e apoiadores de toda e qualquer responsabilidade legal de tudo o que vier a ocorrer por consequência da minha participação neste EVENTO.

14. Emergência clínica 192, Trauma 193. Consultar os hospitais próximos aos locais do evento previamente.

Após ter lido este Termo, e tendo compreendido suas cláusulas, entendo que estou desistindo de direitos substanciais, através da assinatura, a qual faço livre e voluntariamente, sem qualquer coerção.`;

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function parseDate(d?: string): Date | null {
  if (!d) return null;
  const date = new Date(d.length <= 10 ? d + 'T12:00:00' : d);
  return isNaN(date.getTime()) ? null : date;
}

// "12 a 14 de junho de 2026" / "15 de julho de 2026" a partir de start/end
export function formatEventDates(startDate?: string, endDate?: string): string {
  const s = parseDate(startDate);
  const e = parseDate(endDate);
  if (!s) return 'data a definir';
  const month = MONTHS_PT[s.getMonth()];
  const year = s.getFullYear();
  if (e && (e.getMonth() !== s.getMonth() || e.getFullYear() !== s.getFullYear())) {
    return `${s.getDate()} de ${MONTHS_PT[s.getMonth()]} a ${e.getDate()} de ${MONTHS_PT[e.getMonth()]} de ${e.getFullYear()}`;
  }
  if (e && e.getDate() !== s.getDate()) {
    return `${s.getDate()} a ${e.getDate()} de ${month} de ${year}`;
  }
  return `${s.getDate()} de ${month} de ${year}`;
}

// "Capão Alto/SC, 16 de junho de 2026."
export function formatSignLine(signCity: string, date = new Date()): string {
  return `${signCity}, ${date.getDate()} de ${MONTHS_PT[date.getMonth()]} de ${date.getFullYear()}.`;
}

export interface TermVars {
  eventName?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

function replaceAll(s: string, find: string, rep: string): string {
  return s.split(find).join(rep);
}

// Substitui os placeholders do template a partir dos dados da expedição.
export function renderTerm(template: string, vars: TermVars): string {
  const eventName = (vars.eventName || 'expedição 4x4 Mundo Afora').toUpperCase();
  const dates = formatEventDates(vars.startDate, vars.endDate);
  const locationSuffix = vars.location ? `, em ${vars.location}` : '';
  let out = replaceAll(template, '{EVENT_NAME}', eventName);
  out = replaceAll(out, '{EVENT_DATES}', dates);
  out = replaceAll(out, '{EVENT_LOCATION_SUFFIX}', locationSuffix);
  out = replaceAll(out, '{EVENT_LOCATION}', vars.location || '');
  out = replaceAll(out, '{SIGN_CITY}', '');
  out = replaceAll(out, '{SIGN_DATE}', '');
  return out;
}
