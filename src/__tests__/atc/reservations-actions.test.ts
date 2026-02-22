import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks hoisted

const mockRequirePermission = vi.hoisted(() => vi.fn())
const mockRevalidatePath    = vi.hoisted(() => vi.fn())

const mockPrismaReservation = vi.hoisted(() => ({
  findMany:   vi.fn(),
  findUnique: vi.fn(),
  create:     vi.fn(),
  update:     vi.fn(),
  delete:     vi.fn(),
}))

const mockPrismaWaitingList = vi.hoisted(() => ({
  findMany: vi.fn(),
  create:   vi.fn(),
}))

const mockPrismaReservationChannel = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('@/lib/actions/rbac', () => ({ requirePermission: mockRequirePermission }))
vi.mock('next/cache',          () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    reservation:        mockPrismaReservation,
    waitingList:        mockPrismaWaitingList,
    reservationChannel: mockPrismaReservationChannel,
  },
}))

import {
  getReservations,
  getReservation,
  createReservation,
  updateReservation,
  updateReservationStatus,
  deleteReservation,
  getWaitingList,
  addToWaitingList,
  getReservationChannels,
} from '@/modules/atc/actions/reservations'
import type { ReservationFormValues, WaitingListFormValues } from '@/modules/atc/domain/schemas'
import { createMockReservation, createMockWaitingListEntry } from './helpers/mock-factories'

// Datos de prueba

const validChannelId = 'clh1234567890abcdefghijk'

const validReservation: ReservationFormValues = {
  guestName: 'María García',
  partySize: 4,
  date:      new Date('2026-03-15'),
  time:      '21:00',
  channelId: validChannelId,
}

const validWaitingEntry: WaitingListFormValues = {
  guestName:     'Carlos López',
  guestPhone:    '600123456',
  partySize:     2,
  requestedDate: new Date('2026-03-15'),
  priority:      5,
}

// Setup

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
})

// getReservations

describe('getReservations', () => {
  it('requiere permiso read:atc', async () => {
    mockPrismaReservation.findMany.mockResolvedValue([])
    await getReservations()
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'read')
  })

  it('sin filtros: findMany con where={}, include correcto y orderBy [{date:asc},{time:asc}]', async () => {
    const reservations = [createMockReservation()]
    mockPrismaReservation.findMany.mockResolvedValue(reservations)

    const result = await getReservations()

    expect(result).toEqual({ success: true, data: reservations })
    expect(mockPrismaReservation.findMany).toHaveBeenCalledWith({
      where:    {},
      include: {
        channel:       true,
        modifications: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })
  })

  it('filtro status: where contiene {status:CONFIRMED}', async () => {
    mockPrismaReservation.findMany.mockResolvedValue([])

    await getReservations({ status: 'CONFIRMED' as any })

    const call = mockPrismaReservation.findMany.mock.calls[0][0]
    expect(call.where).toMatchObject({ status: 'CONFIRMED' })
  })

  it('filtro date: where.date = {gte: inicio del día, lte: fin del día}', async () => {
    mockPrismaReservation.findMany.mockResolvedValue([])
    const filterDate = new Date('2026-03-15')

    await getReservations({ date: filterDate })

    const call  = mockPrismaReservation.findMany.mock.calls[0][0]
    const { gte, lte } = call.where.date

    // Ambos deben pertenecer al mismo día calendario
    expect(gte.getFullYear()).toBe(2026)
    expect(gte.getMonth()).toBe(2)
    expect(gte.getDate()).toBe(15)
    expect(gte.getHours()).toBe(0)
    expect(gte.getMinutes()).toBe(0)

    expect(lte.getFullYear()).toBe(2026)
    expect(lte.getMonth()).toBe(2)
    expect(lte.getDate()).toBe(15)
    expect(lte.getHours()).toBe(23)
    expect(lte.getMinutes()).toBe(59)
  })

  it('filtro search: where.OR con 3 campos contains mode:insensitive', async () => {
    mockPrismaReservation.findMany.mockResolvedValue([])

    await getReservations({ search: 'García' })

    const call = mockPrismaReservation.findMany.mock.calls[0][0]
    expect(call.where.OR).toEqual([
      { guestName:  { contains: 'García', mode: 'insensitive' } },
      { guestEmail: { contains: 'García', mode: 'insensitive' } },
      { guestPhone: { contains: 'García', mode: 'insensitive' } },
    ])
  })
})

// getReservation

describe('getReservation', () => {
  it('requiere permiso read:atc', async () => {
    mockPrismaReservation.findUnique.mockResolvedValue(null)
    await getReservation('res-test-1')
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'read')
  })

  it('findUnique llamado con include completo (channel, modifications, groupReservation, paymentRecoveries)', async () => {
    const reservation = createMockReservation()
    mockPrismaReservation.findUnique.mockResolvedValue(reservation)

    const result = await getReservation('res-test-1')

    expect(result).toEqual({ success: true, data: reservation })
    expect(mockPrismaReservation.findUnique).toHaveBeenCalledWith({
      where: { id: 'res-test-1' },
      include: {
        channel:           true,
        modifications:     { orderBy: { createdAt: 'desc' } },
        groupReservation:  true,
        paymentRecoveries: true,
      },
    })
  })
})

// createReservation

describe('createReservation', () => {
  it('requiere permiso manage:atc', async () => {
    mockPrismaReservation.create.mockResolvedValue(createMockReservation())
    await createReservation(validReservation)
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'manage')
  })

  it('datos válidos: create llamado y retorna {success:true}', async () => {
    const created = createMockReservation({ id: 'res-new-1' })
    mockPrismaReservation.create.mockResolvedValue(created)

    const result = await createReservation(validReservation)

    expect(result).toEqual({ success: true, data: created })
    expect(mockPrismaReservation.create).toHaveBeenCalledTimes(1)
  })

  it('revalidatePath(/atc/reservations) llamado tras create', async () => {
    mockPrismaReservation.create.mockResolvedValue(createMockReservation())

    await createReservation(validReservation)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/atc/reservations')
  })

  it('Zod inválido (partySize > 50): retorna {success:false}', async () => {
    const result = await createReservation({ ...validReservation, partySize: 51 })
    expect(result.success).toBe(false)
    expect(mockPrismaReservation.create).not.toHaveBeenCalled()
  })
})

// updateReservation

describe('updateReservation', () => {
  it('requiere permiso manage:atc', async () => {
    mockPrismaReservation.update.mockResolvedValue(createMockReservation())
    await updateReservation('res-test-1', validReservation)
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'manage')
  })

  it('update llamado con where:{id} y data validada', async () => {
    const updated = createMockReservation({ guestName: 'María García' })
    mockPrismaReservation.update.mockResolvedValue(updated)

    const result = await updateReservation('res-test-1', validReservation)

    expect(result).toEqual({ success: true, data: updated })
    expect(mockPrismaReservation.update).toHaveBeenCalledWith({
      where: { id: 'res-test-1' },
      data:  expect.objectContaining({ guestName: 'María García', partySize: 4 }),
    })
  })

  it('revalidatePath(/atc/reservations) llamado tras update', async () => {
    mockPrismaReservation.update.mockResolvedValue(createMockReservation())

    await updateReservation('res-test-1', validReservation)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/atc/reservations')
  })
})

// updateReservationStatus

describe('updateReservationStatus', () => {
  it('requiere permiso manage:atc', async () => {
    mockPrismaReservation.update.mockResolvedValue(createMockReservation())
    await updateReservationStatus('res-test-1', 'CONFIRMED' as any)
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'manage')
  })

  it('update llamado con where:{id} y data:{status}', async () => {
    const updated = createMockReservation({ status: 'SEATED' })
    mockPrismaReservation.update.mockResolvedValue(updated)

    const result = await updateReservationStatus('res-test-1', 'SEATED' as any)

    expect(result).toEqual({ success: true, data: updated })
    expect(mockPrismaReservation.update).toHaveBeenCalledWith({
      where: { id: 'res-test-1' },
      data:  { status: 'SEATED' },
    })
  })

  it('revalidatePath(/atc/reservations) llamado tras actualizar estado', async () => {
    mockPrismaReservation.update.mockResolvedValue(createMockReservation())

    await updateReservationStatus('res-test-1', 'CANCELLED' as any)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/atc/reservations')
  })
})

// deleteReservation

describe('deleteReservation', () => {
  it('requiere permiso manage:atc', async () => {
    mockPrismaReservation.delete.mockResolvedValue(undefined)
    await deleteReservation('res-test-1')
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'manage')
  })

  it('delete llamado con where:{id}', async () => {
    mockPrismaReservation.delete.mockResolvedValue(undefined)

    await deleteReservation('res-test-1')

    expect(mockPrismaReservation.delete).toHaveBeenCalledWith({ where: { id: 'res-test-1' } })
  })

  it('revalidatePath(/atc/reservations) llamado tras borrar', async () => {
    mockPrismaReservation.delete.mockResolvedValue(undefined)

    await deleteReservation('res-test-1')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/atc/reservations')
  })

  it('retorna {success:true}', async () => {
    mockPrismaReservation.delete.mockResolvedValue(undefined)

    const result = await deleteReservation('res-test-1')

    expect(result).toEqual({ success: true })
  })
})

// getWaitingList

describe('getWaitingList', () => {
  it('requiere permiso read:atc', async () => {
    mockPrismaWaitingList.findMany.mockResolvedValue([])
    await getWaitingList()
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'read')
  })

  it('findMany con orderBy [{priority:desc},{createdAt:asc}]', async () => {
    const entries = [createMockWaitingListEntry()]
    mockPrismaWaitingList.findMany.mockResolvedValue(entries)

    const result = await getWaitingList()

    expect(result).toEqual({ success: true, data: entries })
    expect(mockPrismaWaitingList.findMany).toHaveBeenCalledWith({
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })
  })
})

// addToWaitingList

describe('addToWaitingList', () => {
  it('requiere permiso manage:atc', async () => {
    mockPrismaWaitingList.create.mockResolvedValue(createMockWaitingListEntry())
    await addToWaitingList(validWaitingEntry)
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'manage')
  })

  it('datos válidos: create llamado y revalidatePath invocado', async () => {
    const created = createMockWaitingListEntry({ id: 'wl-new-1' })
    mockPrismaWaitingList.create.mockResolvedValue(created)

    const result = await addToWaitingList(validWaitingEntry)

    expect(result).toEqual({ success: true, data: created })
    expect(mockPrismaWaitingList.create).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/atc/reservations')
  })

  it('Zod inválido (guestPhone demasiado corto): retorna {success:false}', async () => {
    const result = await addToWaitingList({ ...validWaitingEntry, guestPhone: '12345' })
    expect(result.success).toBe(false)
    expect(mockPrismaWaitingList.create).not.toHaveBeenCalled()
  })

  it('Zod inválido (priority > 10): retorna {success:false}', async () => {
    const result = await addToWaitingList({ ...validWaitingEntry, priority: 11 })
    expect(result.success).toBe(false)
    expect(mockPrismaWaitingList.create).not.toHaveBeenCalled()
  })
})

// getReservationChannels

describe('getReservationChannels', () => {
  it('requiere permiso read:atc', async () => {
    mockPrismaReservationChannel.findMany.mockResolvedValue([])
    await getReservationChannels()
    expect(mockRequirePermission).toHaveBeenCalledWith('atc', 'read')
  })

  it('findMany con where:{isActive:true} y orderBy:{name:asc}', async () => {
    const channels = [{ id: 'ch-1', name: 'Teléfono', isActive: true }]
    mockPrismaReservationChannel.findMany.mockResolvedValue(channels)

    const result = await getReservationChannels()

    expect(result).toEqual({ success: true, data: channels })
    expect(mockPrismaReservationChannel.findMany).toHaveBeenCalledWith({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
    })
  })
})
