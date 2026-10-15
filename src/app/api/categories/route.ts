import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, failure, id, ok, text } from '@/lib/server/api';
export async function POST(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        assert(['income', 'expense'].includes(body.type), 'Jenis kategori tidak valid.');
        const result = await pool.query('INSERT INTO categories(user_id,name,icon,color,type,is_default) VALUES($1,$2,$3,$4,$5,false) RETURNING *', [user, text(body.name), body.icon || 'receipt', body.color || '#52613d', body.type]);
        return ok(result.rows[0]);
    }
    catch (error) {
        return failure(error);
    }
}
export async function PUT(req: Request) {
 try {
  const user=await requireUser(req),body=await req.json();
  if(body.name!==undefined)text(body.name);
  if(body.type!==undefined)assert(['income','expense'].includes(body.type),'Jenis kategori tidak valid.');
  return ok(await atomic(async client=>{
   const owned=await client.query('SELECT * FROM categories WHERE id=$1 AND user_id=$2 FOR UPDATE',[id(body.id),user]);assert(owned.rows[0],'Kategori tidak ditemukan atau merupakan kategori bawaan.',404);
   if(body.type!==undefined&&body.type!==owned.rows[0].type){const used=await client.query('SELECT id FROM transactions WHERE category_id=$1 UNION ALL SELECT id FROM budgets WHERE category_id=$1 LIMIT 1',[body.id]);assert(!used.rows[0],'Jenis kategori tidak dapat diubah setelah digunakan.',409);}
   const result=await client.query('UPDATE categories SET name=COALESCE($1,name),icon=COALESCE($2,icon),color=COALESCE($3,color),is_hidden=COALESCE($4,is_hidden),type=COALESCE($5,type) WHERE id=$6 AND user_id=$7 RETURNING *',[body.name,body.icon,body.color,body.is_hidden,body.type,body.id,user]);return result.rows[0];
  }));
 }catch(error){return failure(error);}
}
export async function DELETE(req: Request) {
    try {
        const user = await requireUser(req), category = id(new URL(req.url).searchParams.get('id'));
        return ok(await atomic(async (client) => { const owned = await client.query('SELECT id FROM categories WHERE id=$1 AND user_id=$2 FOR UPDATE', [category, user]); assert(owned.rows[0], 'Kategori tidak ditemukan atau merupakan kategori bawaan.', 404); const used = await client.query('SELECT id FROM transactions WHERE category_id=$1 UNION ALL SELECT id FROM budgets WHERE category_id=$1 LIMIT 1', [category]); assert(!used.rows[0], 'Kategori masih digunakan oleh transaksi atau budget.', 409); await client.query('DELETE FROM categories WHERE id=$1 AND user_id=$2', [category, user]); return null; }));
    }
    catch (error) {
        return failure(error);
    }
}
