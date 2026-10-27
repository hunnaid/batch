# Accounts

A user registers with a unique username and password.[register] Registration creates the account but doesn't sign them in.

Signing in checks the credentials before starting a session for the authenticated user.[login] Failed authentication does not create a session.

The current-user endpoint resolves an unexpired session to its user.[current] Signing out ends that session without affecting other sessions.[logout]

The HTTP adapter will carry the session token in an HTTP-only cookie. Missing cookie supplies a null session, which the session check rejects as unauthorized. The endpoints check credential and session field types before calling concept actions.

[register]: reaction:Accounts.Register
[login]: reaction:Accounts.Login
[current]: reaction:Accounts.CurrentUser
[logout]: reaction:Accounts.Logout

```endpoints
Accounts.Register at /accounts/register
Accounts.Login at /sessions/start
Accounts.CurrentUser at /sessions/current
Accounts.Logout at /sessions/end
```

The endpoints validate credential and session field types before invoking concept actions. A missing cookie supplies a null session, which session resolution rejects as unauthorized.
