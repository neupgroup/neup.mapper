import Mapper from '@neupgroup/mapper';
import styles from "./page.module.css";


export default async function Home() {
  const users = await Mapper.base('users').select().get();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Users List</h1>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map((user: any) => (
            <li key={user.id} style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
              <strong>{user.name}</strong>: {user.value} <br/>
              <small>{user.email}</small>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
