import { NextRequest, NextResponse } from 'next/server';
import { findClientByIdentity, digits } from '@/lib/clientsStore';

// GET /api/cadastro/lookup?cpf=XXXXXXXXXXX  (público)
// Localiza um cliente já cadastrado por CPF (match exato, 11 dígitos) e devolve
// apenas os campos usados para pré-preencher o formulário. Não expõe família/notas.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = digits(searchParams.get('cpf') || '');

  if (cpf.length !== 11) {
    return NextResponse.json(
      { found: false, error: 'Informe um CPF válido (11 dígitos)' },
      { status: 400 }
    );
  }

  const client = await findClientByIdentity({ cpf });
  // só considera encontrado se o CPF bater exatamente
  if (!client || digits(client.cpf) !== cpf) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    client: {
      name: client.name,
      email: client.email || '',
      phone: client.phone || client.whatsapp || '',
      cpf: client.cpf || '',
      birthDate: client.birthDate || '',
      job: client.job || '',
      address: client.address || '',
      addressNumber: client.addressNumber || '',
      neighborhood: client.neighborhood || '',
      cep: client.cep || '',
      city: client.city || '',
      state: client.state || '',
      vehicleModel: client.vehicle?.model || '',
      vehiclePlate: client.vehicle?.plate || '',
      roomConfig: client.roomConfig || '',
      shirtSizes: client.shirtSizes || [],
    },
  });
}
