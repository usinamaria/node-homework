/**
 * Registers a new user
 * @param {*} req 
 * @param {*} res 
 */
function register(req, res) {
  const { name, email, password } = req.body;

  const user = { name, email, password };

  global.users.push(user);
  global.user_id = user;

  res.status(201).json({
    name: user.name,
    email: user.email,
  });
}

/**
 * Logs in an existing user
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
function logon(req, res) {
  const { email, password } = req.body;

  const user = global.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  global.user_id = user;

  res.status(200).json({
    name: user.name,
    email: user.email,
  });
}

/**
 * Logs out the current user
 * @param {*} req 
 * @param {*} res 
 */
function logoff(req, res) {
  global.user_id = null;
  res.status(200).send();
}

module.exports = {
  register,
  logon,
  logoff,
};
