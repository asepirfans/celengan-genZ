import type { PoolClient } from 'pg';
import { categoryAllowed, id } from './api';
export async function emailCategory(client:PoolClient,user:string,type:string,value:unknown):Promise<string> {
 if(value!=='uncategorized') {const category=id(value);await categoryAllowed(client,category,user,type);return category;}
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['uncategorized:'+user+':'+type]);
 const existing=(await client.query("SELECT id FROM categories WHERE user_id=$1 AND type=$2 AND lower(trim(name))='belum dikategorikan' ORDER BY id LIMIT 1",[user,type])).rows[0];
 return existing?.id||(await client.query("INSERT INTO categories(user_id,name,icon,color,type,is_default) VALUES($1,'Belum dikategorikan','receipt','#76834E',$2,false) RETURNING id",[user,type])).rows[0].id;
}
