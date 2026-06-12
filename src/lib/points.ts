/**
 * 积分流水类型常量
 */
export const POINT_TYPES = {
  // 获得积分
  SIGNUP_BONUS: "signup_bonus",
  BIND_PHONE_BONUS: "bind_phone_bonus",
  VERIFY_EMAIL_BONUS: "verify_email_bonus",
  INVITE_BONUS: "invite_bonus",
  REFUND: "refund",
  ADMIN_ADJUST: "admin_adjust",

  // 消费积分
  GENERATION_COST: "generation_cost",
} as const;

export type PointTransactionType =
  (typeof POINT_TYPES)[keyof typeof POINT_TYPES];

/**
 * 积分服务错误码
 */
export const POINTS_ERROR_CODES = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_POINTS_AMOUNT: "INVALID_POINTS_AMOUNT",
  INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  PHONE_NOT_BOUND: "PHONE_NOT_BOUND",
  PHONE_NOT_VERIFIED: "PHONE_NOT_VERIFIED",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",
} as const;

export type PointsErrorCode =
  (typeof POINTS_ERROR_CODES)[keyof typeof POINTS_ERROR_CODES];

/**
 * 积分奖励配置
 */
export const POINTS_REWARD_CONFIG = {
  // 注册奖励
  SIGNUP_BONUS: 50,
  // 绑定手机奖励
  BIND_PHONE_BONUS: 50,
  // 验证邮箱奖励
  VERIFY_EMAIL_BONUS: 30,
  // 邀请奖励（邀请人）
  INVITE_BONUS: 20,
  // 首次消费奖励
  FIRST_CONSUMPTION_BONUS: 10,
} as const;

/**
 * 积分消费配置
 */
export const POINTS_COST_CONFIG = {
  // 每次剧本生成消耗
  GENERATION_COST: 10,
} as const;