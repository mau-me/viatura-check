'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/mongodb'
import { uploadPhoto, deletePhoto } from '@/lib/gridfs'
import { departureSchema, returnSchema, PHOTO_KEYS } from '@/lib/validation'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/jwt'
import { findUserByMatricula } from '@/lib/auth'

const MAX_PHOTO_SIZE = (parseInt(process.env.MAX_PHOTO_SIZE_MB || '2') || 2) * 1024 * 1024

const CHECKLIST_KEYS = [
  'oleo_motor',
  'arrefecimento',
  'pneus',
  'partida_motor',
  'freios',
  'identificacao_visual',
  'limpeza',
  'iluminacao',
  'retrovisores',
  'ad_blue',
  'giroflex_sirene',
] as const

export async function createDepartureAction(formData: FormData) {
  try {
    const session = await getSession()
    if (!session) return { error: 'Não autenticado' }

    const user = await findUserByMatricula(session.matricula)
    if (!user) return { error: 'Usuário não encontrado' }

    const { db } = await connectToDatabase()

    const existingOpen = await db.collection('handovers').findOne({
      status: 'aberto',
      $or: [
        { 'departureOfficer.matricula': session.matricula },
        { plate: (formData.get('plate') as string || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() },
      ],
    })
    if (existingOpen) {
      if (existingOpen.departureOfficer?.matricula === session.matricula) {
        return { error: 'Você já possui uma viatura em aberto. Finalize a devolução antes de registrar outra carga.' }
      }
      return { error: `A viatura ${existingOpen.plate} já possui um registro em aberto.` }
    }

    const plate = (formData.get('plate') as string || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()

    const raw = {
      plate,
      departureOfficer: {
        patente: user.patente,
        nome: user.nome,
        matricula: user.matricula,
      },
      deliveringOfficer: {
        patente: (formData.get('delivered_patente') as string) || '',
        nome: (formData.get('delivered_nome') as string) || '',
      },
      garrisonCommander: {
        patente: (formData.get('garrison_patente') as string) || '',
        nome: (formData.get('garrison_nome') as string) || '',
      },
      serviceType: (formData.get('service_type') as string) || 'ordinario',
      serviceTypeOther: (formData.get('service_type_other') as string) || '',
      km_initial: formData.get('km_initial'),
      departureChecklist: {} as Record<string, 'ok' | 'alteracao'>,
      departureChecklistObs: {} as Record<string, string>,
      departureObservations: formData.get('observations'),
    }

    for (const item of CHECKLIST_KEYS) {
      const status = formData.get(`check_${item}`)
      if (status !== 'ok' && status !== 'alteracao') {
        return { error: `Status inválido para o item ${item}` }
      }
      raw.departureChecklist[item] = status
      if (status === 'alteracao') {
        raw.departureChecklistObs[item] = (formData.get(`obs_${item}`) as string || '').trim()
      }
    }

    const parsed = departureSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const photoIds: Record<string, string> = {}
    for (const { key } of PHOTO_KEYS) {
      const file = formData.get(`photo_${key}`) as File | null
      if (!file || !file.size) return { error: `Foto "${key}" é obrigatória` }

      if (file.size > MAX_PHOTO_SIZE) {
        return { error: `Foto "${key}" excede o tamanho máximo de ${MAX_PHOTO_SIZE / 1024 / 1024}MB` }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const id = await uploadPhoto(buffer, `${plate}_${key}_departure.jpg`, file.type || 'image/jpeg')
      photoIds[key] = id
    }

    const now = new Date()
    const result = await db.collection('handovers').insertOne({
      status: 'aberto',
      plate: parsed.data.plate,
      departureOfficer: parsed.data.departureOfficer,
      deliveringOfficer: parsed.data.deliveringOfficer,
      garrisonCommander: parsed.data.garrisonCommander,
      serviceType: parsed.data.serviceType,
      serviceTypeOther: parsed.data.serviceTypeOther || '',
      returnOfficer: null,
      kilometers: { initial: parsed.data.km_initial, final: null },
      departureChecklist: parsed.data.departureChecklist,
      departureChecklistObs: parsed.data.departureChecklistObs || {},
      departureObservations: parsed.data.departureObservations || '',
      departurePhotos: photoIds,
      returnPhotos: null,
      returnObservations: null,
      returnedAt: null,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error('Erro ao criar carga:', error)
    return { error: 'Erro ao salvar. Tente novamente.' }
  }
}

export async function completeReturnAction(id: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session) return { error: 'Não autenticado' }

    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }
    if (doc.status !== 'aberto') return { error: 'Este registro já foi finalizado' }
    if (doc.departureOfficer?.matricula !== session.matricula) {
      return { error: 'Apenas o policial que fez a carga pode registrar a devolução' }
    }

    const kmFinal = parseInt(formData.get('km_final') as string || '0', 10)
    if (isNaN(kmFinal) || kmFinal < 0) return { error: 'Kilometragem final inválida' }
    if (kmFinal < doc.kilometers.initial) {
      return { error: 'Kilometragem final não pode ser menor que a inicial' }
    }

    const rawReturn = {
      km_final: kmFinal,
      returnOfficer: {
        patente: (formData.get('return_patente') as string) || '',
        nome: (formData.get('return_nome') as string) || '',
      },
      returnObservations: formData.get('return_observations'),
    }

    const parsedReturn = returnSchema.safeParse(rawReturn)
    if (!parsedReturn.success) {
      return { error: parsedReturn.error.issues[0]?.message || 'Dados inválidos' }
    }

    const photoIds: Record<string, string> = {}
    for (const { key } of PHOTO_KEYS) {
      const file = formData.get(`return_photo_${key}`) as File | null
      if (!file || !file.size) return { error: `Foto "${key}" é obrigatória na devolução` }

      if (file.size > MAX_PHOTO_SIZE) {
        return { error: `Foto "${key}" excede o tamanho máximo de ${MAX_PHOTO_SIZE / 1024 / 1024}MB` }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const id = await uploadPhoto(buffer, `${doc.plate}_${key}_return.jpg`, file.type || 'image/jpeg')
      photoIds[key] = id
    }

    const now = new Date()
    await db.collection('handovers').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'fechado',
          returnOfficer: parsedReturn.data.returnOfficer,
          kilometers: { initial: doc.kilometers.initial, final: parsedReturn.data.km_final },
          returnPhotos: photoIds,
          returnObservations: parsedReturn.data.returnObservations || '',
          returnedAt: now,
          updatedAt: now,
        },
      }
    )

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao finalizar devolução:', error)
    return { error: 'Erro ao salvar. Tente novamente.' }
  }
}

export async function adminCloseHandoverAction(id: string) {
  try {
    const session = await getSession()
    if (!session) return { error: 'Não autenticado' }

    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ matricula: session.matricula })
    if (!user || user.role !== 'admin') return { error: 'Apenas administradores podem fechar registros' }

    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }
    if (doc.status !== 'aberto') return { error: 'Este registro já foi finalizado' }

    const now = new Date()
    await db.collection('handovers').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'fechado',
          returnedAt: now,
          updatedAt: now,
        },
      }
    )

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao fechar registro:', error)
    return { error: 'Erro ao fechar registro' }
  }
}

export async function getOpenHandoverByOfficer(matricula: string) {
  try {
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne(
      { status: 'aberto', 'departureOfficer.matricula': matricula },
      { sort: { createdAt: -1 } }
    )
    if (!doc) return { success: true, record: null }
    return { success: true, record: { ...doc, _id: doc._id.toString() } }
  } catch (error) {
    console.error('Erro ao buscar viatura em aberto:', error)
    return { error: 'Erro ao buscar viatura em aberto' }
  }
}

export async function getHandoversAction(query = '', status: 'abertos' | 'fechados' | 'todos' = 'todos') {
  try {
    const { db } = await connectToDatabase()

    const filters: Record<string, unknown>[] = []

    if (query) {
      filters.push({
        $or: [
          { plate: { $regex: query, $options: 'i' } },
          { 'departureOfficer.nome': { $regex: query, $options: 'i' } },
          { 'departureOfficer.matricula': { $regex: query, $options: 'i' } },
        ],
      })
    }

    if (status === 'abertos') {
      filters.push({ status: 'aberto' })
    } else if (status === 'fechados') {
      filters.push({ status: 'fechado' })
    }

    const filter = filters.length > 0 ? { $and: filters } : {}

    const docs = await db
      .collection('handovers')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    return {
      success: true,
      records: docs.map((d) => ({
        _id: d._id.toString(),
        plate: d.plate,
        status: d.status,
        departureOfficer: d.departureOfficer,
        kilometers: d.kilometers,
        createdAt: d.createdAt,
        returnedAt: d.returnedAt,
        hasDepartureAlteration: Object.values(d.departureChecklist || {}).includes('alteracao'),
      })),
    }
  } catch (error) {
    console.error('Erro ao buscar registros:', error)
    return { error: 'Erro ao buscar registros' }
  }
}

export async function getHandoverByIdAction(id: string) {
  try {
    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }
    return { success: true, record: { ...doc, _id: doc._id.toString() } }
  } catch (error) {
    console.error('Erro ao buscar registro:', error)
    return { error: 'Erro ao buscar registro' }
  }
}

export async function deleteHandoverAction(id: string) {
  try {
    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }

    const allPhotoKeys = [...PHOTO_KEYS]
    for (const { key } of allPhotoKeys) {
      const depPid = doc.departurePhotos?.[key]
      if (depPid) await deletePhoto(depPid)
      const retPid = doc.returnPhotos?.[key]
      if (retPid) await deletePhoto(retPid)
    }

    await db.collection('handovers').deleteOne({ _id: new ObjectId(id) })
    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir registro:', error)
    return { error: 'Erro ao excluir registro' }
  }
}
