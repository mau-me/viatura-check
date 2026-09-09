'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/mongodb'
import { vehicleSchema } from '@/lib/validation'
import { ObjectId } from 'mongodb'
import { requireAdmin } from '@/lib/jwt'

function normalizePlate(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9.]/g, '').toUpperCase()
  if (/^\d{5}$/.test(cleaned)) {
    return cleaned.slice(0, 1) + '.' + cleaned.slice(1)
  }
  return cleaned
}

export async function createVehicleAction(formData: FormData) {
  try {
    await requireAdmin()

    const raw = {
      prefix: formData.get('prefix'),
      plate: formData.get('plate'),
      model: formData.get('model'),
      year: formData.get('year'),
    }

    const parsed = vehicleSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { db } = await connectToDatabase()

    const existing = await db.collection('vehicles').findOne({ prefix: parsed.data.prefix })
    if (existing) {
      return { error: 'Já existe viatura com este prefixo' }
    }

    const now = new Date()
    const result = await db.collection('vehicles').insertOne({
      prefix: parsed.data.prefix,
      plate: parsed.data.plate,
      model: parsed.data.model,
      year: parsed.data.year,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/admin')
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error('Erro ao criar viatura:', error)
    return { error: 'Erro ao criar viatura' }
  }
}

export async function updateVehicleAction(id: string, formData: FormData) {
  try {
    await requireAdmin()

    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }

    const raw = {
      prefix: formData.get('prefix'),
      plate: formData.get('plate'),
      model: formData.get('model'),
      year: formData.get('year'),
    }

    const parsed = vehicleSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { db } = await connectToDatabase()

    const existing = await db.collection('vehicles').findOne({
      prefix: parsed.data.prefix,
      _id: { $ne: new ObjectId(id) },
    })
    if (existing) {
      return { error: 'Já existe viatura com este prefixo' }
    }

    await db.collection('vehicles').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...parsed.data, updatedAt: new Date() } }
    )

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar viatura:', error)
    return { error: 'Erro ao atualizar viatura' }
  }
}

export async function deleteVehicleAction(id: string) {
  try {
    await requireAdmin()

    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }

    const { db } = await connectToDatabase()
    const result = await db.collection('vehicles').deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) return { error: 'Viatura não encontrada' }

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir viatura:', error)
    return { error: 'Erro ao excluir viatura' }
  }
}

export async function listVehiclesAction(query = '') {
  try {
    const { db } = await connectToDatabase()

    const openHandovers = await db
      .collection('handovers')
      .find({ status: 'aberto' }, { projection: { plate: 1 } })
      .toArray()
    const busyPrefixes = new Set(openHandovers.map((h) => normalizePlate(h.plate)))

    const filter: Record<string, unknown> = {}

    if (query) {
      filter.$or = [
        { prefix: { $regex: query, $options: 'i' } },
        { plate: { $regex: query, $options: 'i' } },
        { model: { $regex: query, $options: 'i' } },
      ]
    }

    const vehicles = await db
      .collection('vehicles')
      .find(filter)
      .sort({ prefix: 1 })
      .toArray()

    return {
      success: true,
      vehicles: vehicles.map((v) => ({
        _id: v._id.toString(),
        prefix: v.prefix,
        plate: v.plate,
        model: v.model,
        year: v.year,
        isBusy: busyPrefixes.has(v.prefix),
      })),
    }
  } catch (error) {
    console.error('Erro ao listar viaturas:', error)
    return { error: 'Erro ao listar viaturas', vehicles: [] }
  }
}
