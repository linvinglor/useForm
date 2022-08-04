/* eslint-disable valid-jsdoc */

import {useState, useMemo, useRef, useReducer} from 'react';
// import {OptionalObjectSchema} from 'yup/lib/object';

/**
 *
 *  form 验证的想法：
 *  1、 验证不能限定使用什么组件，可能第三方的组件/原生组件更适合需求
 *  2、 验证不能限定触发的事件范围，不关心别人使用什么事件
 *  3、 提交之前需要做一次验证，那么最好就是在内部定义一个 submit 函数，外部使用者自己确定是否要使用什么组件来触发
 *  4、 提交过程需要提供一个loading状态，防止用户多次点击
 */

type validationFun<T extends object> = (
  value: any,
  fromValue: T
) => string | null | Promise<string | null | undefined>;

type validationType<T extends object> = Partial<
  Record<keyof T, validationFun<T> | validationFun<T>[]>
>;

type useFormType<T extends object> = {
  initialValue?: T;
  validation?: validationType<T>;
  schema?: any;
  onSubmit: (value: T) => Promise<void>;
};

/**
 * 对某一个属性值进行验证
 * @param arr
 * @param value
 * @returns
 */
async function runFunctions<T extends object>(arr: validationFun<T>[], value: any, formValue: T) {
  const len = arr.length;
  let errorMsg;
  for (let index = 0; index < len; index++) {
    const fun = arr[index];
    errorMsg = await fun(value, formValue);
    if (errorMsg) {
      // 向外抛出一个错误的信息
      return Promise.reject(errorMsg);
    }
  }
  return undefined;
}

async function runValidation<T extends object>(
  validation: validationType<T>,
  formValue: T,
  includeKeys?: string[],
  schema?: any,
  setVerifying?: any
) {
  const errored: {[K: string]: string} = {};
  const keys = includeKeys || Object.keys(formValue);
  if (schema) {
    // schema 验证
    const promiseArray = keys.map((key) => {
      setVerifying({key, verifying: true});
      // schema.validate()
      return schema.validateAt(key, formValue).finally(() => {
        setVerifying({key, verifying: !true});
      });
    });

    // 不使用这种形式，这种只会验证一次，当第一个错误被抛出的时候变停止验证
    // await schema.validate(formValue).catch((err) => {
    //   console.log('errr', err);
    // });

    // 使用这种形式对所有的都进行验证，知道每一个元素都 done 或者 抛出 了错误
    await Promise.allSettled(promiseArray).then((values) => {
      values.map((errorItem, index) => {
        console.log(errorItem);
        errored[keys[index]] = errorItem?.reason?.errors[0] || '';
      });
      return errored;
    });
  } else {
    //  validation 的形式，也需要向上面的那种，对每个值进行单独的验证
    const promiseArray = keys.map((key) => {
      let validationValue = validation[key];
      if (typeof validationValue === 'function') {
        validationValue = [validationValue];
      }
      setVerifying({key, verifying: true});
      return runFunctions(validationValue, formValue[key], formValue).finally(() => {
        setVerifying({key, verifying: !true});
      });
    });

    await Promise.allSettled(promiseArray).then((values) => {
      values.map((valueItem, index) => {
        errored[keys[index]] = valueItem?.reason || '';
      });
    });
  }

  return errored;
}

export const useForm = <T extends object>(props: useFormType<T>) => {
  const {validation, initialValue = {} as T, onSubmit, schema} = props;
  // 如果keyMap 改变了，意味着我们需要重新验证
  const [flashFlag, setFlashFlag] = useState(0);
  // form 的输入的值
  const [formValue, setFormValue] = useState<T>(initialValue);
  // 是否处于提交状态
  const [submitting, setSubmitting] = useState(false);
  // 一个验证过程的状态
  const [verifying, setVerifying] = useReducer(
    (state: Partial<Record<keyof T, boolean>>, action: {key: keyof T; verifying: boolean}) => {
      const {key, verifying} = action;
      return {...state, [key]: verifying};
    },
    {}
  );
  // 错误消息
  const [errorMsg, setErrored] = useState<Record<string, string>>({});
  const valueRef = useRef({
    formValue,
    errorMsg,
    schema,
  });
  valueRef.current = {
    formValue,
    errorMsg,
    schema,
  };
  // 验证函数和设置值的函数永远保持不变
  const callBackMemo = useMemo(() => {
    return {
      /**
       * 验证一个，多个，全部的属性值, 使用这种方式，可以让外部自己定义 是 onChange， onBlur 或者 onFocus 来触发
       * todo： 验证的时候如何让所有值都更新完毕之后再进行验证过程
       * @param keys
       */
      verify: async (keys?: keyof T | (keyof T)[]) => {
        // 验证方式待优化，这个是为了防止在 onChange 里面调研 verify 方法，无法使用最新的值而设置的强制刷新
        setFlashFlag(Math.random());
        const promise = () => {
          return new Promise<boolean>((resolve) => {
            requestAnimationFrame(async () => {
              const {formValue, errorMsg, schema} = valueRef.current;
              if (keys && !Array.isArray(keys)) {
                keys = [keys];
              }
              if (!keys) {
                keys = Object.keys(formValue);
              }

              const errored = await runValidation(
                validation as any,
                formValue,
                keys as string[],
                schema,
                setVerifying
              );

              // 合并错误信息
              Object.assign(errorMsg, errored);
              Object.keys(errorMsg).forEach((key) => {
                if (!errorMsg[key]) {
                  delete errorMsg[key];
                }
              });
              setErrored({...errorMsg});
              resolve(!!Object.keys(errorMsg).length);
            });
          });
        };
        return await promise();
      },
      /**
       *设置值，可以设置一个或者多个值
       * @param value
       */
      setValue: (value: Partial<Record<keyof T, any>>) => {
        setFormValue({...valueRef.current.formValue, ...value});
      },
      /**
       * 清空value状态
       */
      clearError() {
        setErrored({});
      },
    };
  }, []);

  const submit = async function () {
    if (submitting) {
      // 禁止重复提交
      console.warn('当前正在提交中，禁止重复提交');
      return;
    }
    setSubmitting(true);

    // 这个验证，需要返回具体是哪一个的验证错误，以一个对象的形式最合适
    const isErrored = await callBackMemo.verify();

    if (isErrored) {
      // 存在错误，那么需要直接返回并终止提交
      setSubmitting(false);
      return;
    }
    try {
      // 提交信息到后端
      await onSubmit(formValue);
    } catch (error) {
      // 如果接受到 onSubmit 里面抛出的错误
      // 需要用户使用 toast 来提示具体出现了什么错误
    } finally {
      setSubmitting(false);
    }
  };

  return {
    value: formValue,
    submitting,
    errorMsg,
    verifying,
    submit,
    ...callBackMemo,
  };
};
