import argon2 from "argon2";

const argon2Options = {
  type: argon2.argon2id as 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argon2Options);
}

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}
