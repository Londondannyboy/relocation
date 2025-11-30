import { StackProvider, StackTheme, useUser, UserButton } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

function ProfileContent() {
  const user = useUser();

  if (!user) {
    return (
      <div className="container">
        <h1>Not Signed In</h1>
        <p>You need to sign in to view this page.</p>
        <a href="/handler/sign-in" className="btn">Sign In</a>
        <br /><br />
        <a href="/">Back to Home</a>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Your Profile</h1>
      <div style={{ marginBottom: '1rem' }}>
        <UserButton />
      </div>
      <div className="user-info">
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.primaryEmail || 'No email'}</p>
        <p><strong>Display Name:</strong> {user.displayName || 'No name set'}</p>
      </div>
      <button onClick={() => user.signOut()}>Sign Out</button>
      <br /><br />
      <a href="/">Back to Home</a>
    </div>
  );
}

export default function UserProfile() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ProfileContent />
      </StackTheme>
    </StackProvider>
  );
}
