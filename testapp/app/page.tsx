import Mapper from '@neupgroup/mapper';
import styles from "./page.module.css";


export default async function Home() {


  // Update the data of aadarsh
  try {
    await Mapper.schemas('users').where({ username: 'aadarsh' }).set({
      username: 'nameofperson',
      created_by: 'should_be_stripped' // Testing update validation too
    }).update();
    console.log("User updated.");
  } catch (e: any) {
    console.log("Update error:", e.message);
  }

  console.log("returning the inserted user object");
  const returns = await Mapper.schemas('users').get();
  
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Users List</h1>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {returns.map((user: any) => (
            <li key={user.id} style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
              <strong>{user.username}</strong> <br/>
              <small>{user.created_at}</small>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
