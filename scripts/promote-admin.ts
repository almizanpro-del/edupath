/**
 * Promote a user to admin role by email.
 * Usage: bun run scripts/promote-admin.ts user@example.com
 *
 * Also can be used via the Supabase dashboard by running:
 *   UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';
 *
 * Note: For local SQLite dev. For Postgres production, run via psql.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: bun run scripts/promote-admin.ts <email>')
    process.exit(1)
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`User with email ${email} not found.`)
    console.error('The user must sign in at least once so their Prisma profile is created from Supabase.')
    process.exit(1)
  }

  const updated = await db.user.update({
    where: { email },
    data: { role: 'admin' },
  })

  console.log(`✓ Promoted ${updated.email} to admin.`)
  console.log(`  Name: ${updated.name}`)
  console.log(`  Role: ${updated.role}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
